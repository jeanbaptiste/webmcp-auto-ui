/**
 * Agent loop — inspired from Archive/agent/src/loop.ts
 * Runs LLM → tool call → LLM until end_turn or max iterations
 * UI tools are executed via callbacks (no MCP roundtrip)
 */

import type { McpClient, McpTool } from '@webmcp-auto-ui/core';
import { sanitizeSchema } from '@webmcp-auto-ui/core';
import type {
  ChatMessage, ContentBlock, ToolCall, AgentMetrics, AgentResult,
  LLMProvider, AnthropicTool, McpToolDef, AgentCallbacks,
} from './types.js';
import type { ToolLayer, SkillLayer } from './tool-layers.js';
import { buildToolsFromLayers } from './tool-layers.js';
import { isUITool, executeUITool } from './ui-tools.js';
import {
  executeListComponents, executeGetComponent, executeComponent,
} from './component-tool.js';
// formatRecipesForPrompt / formatMcpRecipesForPrompt removed — recipes are discoverable via tools
import { activateSkill } from './skill-executor.js';

const MAX_RESULT_LEN = 10_000;

/** Tools that indicate the agent is discovering/exploring rather than acting */
const DISCOVERY_TOOLS = new Set([
  'get_recipe', 'search_recipes', 'list_recipes', 'get_component', 'list_components', 'recall',
  'list_tables', 'describe_table', 'get_json_schemas', 'get_typescript_types',
]);

function isDiscoveryTool(name: string): boolean {
  return DISCOVERY_TOOLS.has(name);
}

/**
 * recall — lets the LLM re-read the full result of a previous tool call on demand,
 * instead of keeping all results in the context window.
 */
export const RECALL_TOOL: AnthropicTool = {
  name: 'recall',
  description: "Re-read the full result of a previous tool call. Use the identifier returned in the summary (e.g. recall('toolu_xxx')).",
  input_schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: "Tool call ID (e.g. 'toolu_xxx')",
      },
    },
    required: ['id'],
  },
};

/**
 * Compress old tool_result blocks in conversation history.
 * IMPORTANT: mutates messages in-place intentionally to reduce memory usage.
 * The caller's `result.messages` will contain compressed versions.
 *
 * Once the LLM has read a tool_result and produced a response, the full result
 * is no longer needed — replace it with a truncated preview to save context.
 * Only compresses messages before the last 2 (current iteration).
 * When a resultBuffer is provided, includes a recall('id') hint so the LLM
 * can retrieve the full result on demand.
 */
function compressOldToolResults(messages: ChatMessage[], resultBuffer?: Map<string, string>): void {
  for (let i = 0; i < messages.length - 2; i++) {
    const msg = messages[i];
    if (typeof msg.content !== 'string' && Array.isArray(msg.content)) {
      for (let j = 0; j < msg.content.length; j++) {
        const block = msg.content[j];
        if (block.type === 'tool_result' && typeof block.content === 'string' && block.content.length > 300) {
          const preview = block.content.slice(0, 200);
          const totalLen = block.content.length;
          const id = block.tool_use_id;
          if (resultBuffer && resultBuffer.has(id)) {
            (block as any).content = `${preview}... [recall('${id}') pour le résultat complet, ${totalLen} chars]`;
          } else {
            (block as any).content = `${preview}... [compressed, ${totalLen} chars original]`;
          }
        }
      }
    }
  }
}

/** Build system prompt — behavioral rules only, tool descriptions come from tool definitions. */
export function buildSystemPrompt(layers: ToolLayer[]): string {
  return `Tu es un assistant UI. Affiche les résultats avec component(nom, {params}).
Ne fabrique jamais d'URLs d'images — utilise uniquement celles retournées par les outils.

STRATÉGIE :
1. Si search_recipes est disponible, consulte-le ABSOLUMENT EN PRIORITÉ — les recettes contiennent des instructions optimisées
2. Appelle get_component(nom) pour obtenir le schéma et les recettes associées
3. Appelle les outils de données pour récupérer les données
4. Appelle component(nom, {params}) pour afficher`;
}

export function mcpToolsToAnthropic(tools: McpToolDef[]): AnthropicTool[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description ?? t.name,
    input_schema: sanitizeSchema(
      (t.inputSchema ?? { type: 'object', properties: {} }) as import('@webmcp-auto-ui/core').JsonSchema
    ) as Record<string, unknown>,
  }));
}

function truncateResult(result: string): string {
  if (result.length <= MAX_RESULT_LEN) return result;
  try {
    const parsed: unknown = JSON.parse(result);
    if (Array.isArray(parsed)) {
      let sliced = parsed;
      while (JSON.stringify(sliced).length > MAX_RESULT_LEN && sliced.length > 1) {
        sliced = sliced.slice(0, Math.ceil(sliced.length / 2));
      }
      return JSON.stringify(sliced) + `\n... (tronqué, ${parsed.length} items total)`;
    }
  } catch { /* not JSON */ }
  return result.slice(0, MAX_RESULT_LEN) + '\n... (tronqué)';
}

export interface AgentLoopOptions {
  client?: McpClient;           // MCP client — optional if only UI tools used
  provider: LLMProvider;
  /** Structured tool layers (replaces legacy mcpTools) */
  layers?: ToolLayer[];
  maxIterations?: number;
  maxTokens?: number;
  maxTools?: number;
  temperature?: number;
  topK?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;
  initialMessages?: ChatMessage[]; // conversation history from previous turns
  callbacks?: AgentCallbacks;
  signal?: AbortSignal;
  /** Enable schema validation for component() calls (default: true) */
  schemaValidation?: boolean;
}

export async function runAgentLoop(
  userMessage: string,
  options: AgentLoopOptions
): Promise<AgentResult> {
  const {
    client,
    provider,
    maxIterations = 5,
    maxTokens,
    maxTools,
    temperature,
    topK,
    cacheEnabled = true,
    initialMessages = [],
    callbacks = {},
    signal,
    schemaValidation = true,
  } = options;

  // Buffer for recall — stores full tool results keyed by tool_use_id
  const resultBuffer = new Map<string, string>();

  // Build tools and prompt from layers
  const allTools: AnthropicTool[] = [...buildToolsFromLayers(options.layers ?? []), RECALL_TOOL];
  const baseSystemPrompt: string = options.systemPrompt ?? buildSystemPrompt(options.layers ?? []);

  const systemPrompt = maxTokens
    ? `${baseSystemPrompt}\n\nIMPORTANT : Limite tes réponses à ${maxTokens} tokens.`
    : baseSystemPrompt;

  const messages: ChatMessage[] = [...initialMessages, { role: 'user', content: userMessage }];

  const metrics: AgentMetrics = {
    totalTokens: 0, promptTokens: 0, completionTokens: 0,
    totalLatencyMs: 0, toolCalls: 0, iterations: 0, cacheHits: 0,
  };

  const allToolCalls: ToolCall[] = [];
  let lastText = '';
  let finishedNormally = false;
  let discoveryPhase = false;
  let iterationsWithoutRender = 0;
  let nudgedOnce = false;
  let hasRendered = false;

  for (let i = 0; i < maxIterations; i++) {
    if (signal?.aborted) break;
    metrics.iterations++;
    callbacks.onIterationStart?.(i + 1, maxIterations);

    // Fix 2: after 4+ iterations without render, strip discovery tools to force rendering
    let iterationTools = allTools;
    if (iterationsWithoutRender >= 4 && !hasRendered) {
      iterationTools = allTools.filter(t => !isDiscoveryTool(t.name));
    }

    // Fix 3: after 5+ iterations without render, inject a nudge message (once)
    if (iterationsWithoutRender >= 5 && !hasRendered && !nudgedOnce) {
      nudgedOnce = true;
      messages.push({
        role: 'user',
        content: 'STOP exploration. Use the data you already collected. Call component("table", {rows: [...]}) NOW to display results.',
      });
    }

    callbacks.onLLMRequest?.(messages, iterationTools);
    const t0 = performance.now();
    let streamingText = '';
    const response = await provider.chat(messages, iterationTools, {
      signal, cacheEnabled, system: systemPrompt, maxTokens, maxTools, temperature, topK,
      onToken: callbacks.onToken ? (token) => {
        callbacks.onToken!(token);
        // Stream partial text to UI as tokens arrive
        streamingText += token;
        callbacks.onText?.(streamingText);
      } : undefined,
    });
    const latencyMs = performance.now() - t0;
    metrics.totalLatencyMs += latencyMs;

    if (response.usage) {
      metrics.promptTokens += response.usage.input_tokens;
      metrics.completionTokens += response.usage.output_tokens;
      metrics.totalTokens += response.usage.input_tokens + response.usage.output_tokens;
      metrics.cacheHits += response.usage.cache_read_input_tokens ?? 0;
    }

    callbacks.onLLMResponse?.(response, latencyMs, response.usage ? {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    } : undefined);

    const textBlocks = response.content.filter(b => b.type === 'text') as { type: 'text'; text: string }[];
    const toolBlocks = response.content.filter(b => b.type === 'tool_use') as {
      type: 'tool_use'; id: string; name: string; input: Record<string, unknown>;
    }[];

    lastText = textBlocks.map(b => b.text).join('\n');

    if (toolBlocks.length === 0) {
      // Fix 5: if no tool calls and nothing rendered yet, nudge the LLM to render (once)
      if (!hasRendered && !nudgedOnce && metrics.toolCalls > 0) {
        nudgedOnce = true;
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: 'Tu n\'as pas encore affiché de résultat visuel. Appelle component() avec les données que tu as récoltées.' });
        continue; // Force another iteration instead of ending
      }
      messages.push({ role: 'assistant', content: response.content });
      callbacks.onText?.(lastText);
      finishedNormally = true;
      break;
    }

    // Texte intermédiaire (reasoning/commentary avant les tool_use) — mise à jour live
    if (lastText) callbacks.onText?.(lastText);

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: ContentBlock[] = [];
    for (const block of toolBlocks) {
      const call: ToolCall = { id: block.id, name: block.name, args: block.input };
      // Provenance tracking: mark whether this call is guided by a prior discovery
      const wasDiscovering = discoveryPhase;
      if (isDiscoveryTool(block.name)) {
        discoveryPhase = true;
        call.guided = false; // discovery tools are never "guided", they ARE discovery
      } else {
        call.guided = wasDiscovering; // non-discovery tool guided by prior discovery
        discoveryPhase = false;
      }
      const t1 = performance.now();

      try {
        let result: string;

        if (block.name === 'recall') {
          const recallId = (block.input as { id: string }).id;
          result = resultBuffer.get(recallId) ?? `Aucun résultat trouvé pour l'id '${recallId}'.`;
        } else if (block.name === 'list_components') {
          result = executeListComponents();
        } else if (block.name === 'get_component') {
          const gcInput = block.input as Record<string, unknown>;
          const gcName = String(gcInput.name ?? gcInput.nom ?? gcInput.component ?? '');
          result = executeGetComponent(gcName);
        } else if (block.name === 'component') {
          const cInput = block.input as Record<string, unknown>;
          const cName = String(cInput.name ?? cInput.nom ?? cInput.component ?? '');
          result = executeComponent(
            { name: cName, params: cInput.params as unknown },
            callbacks,
            { schemaValidation },
          );
        } else if (block.name === 'use_skill') {
          const skillInput = block.input as Record<string, unknown>;
          const skillLayers = (options.layers ?? []).filter((l): l is SkillLayer => l.source === 'skill');
          const allSkills = skillLayers.flatMap(l => l.skills);
          result = activateSkill(
            String(skillInput.skill ?? ''),
            allSkills,
          );
        } else if (isUITool(block.name)) {
          result = executeUITool(block.name, block.input, callbacks);
        } else if (client) {
          const mcpResult = await client.callTool(block.name, block.input);
          const textContent = mcpResult.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined;
          result = truncateResult(textContent?.text ?? JSON.stringify(mcpResult));
        } else {
          result = `Error: no MCP client available for tool ${block.name}`;
        }

        // Store full result in buffer for later recall
        resultBuffer.set(block.id, result);

        call.result = result;
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      } catch (e) {
        call.error = e instanceof Error ? e.message : String(e);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${call.error}` });
      }

      call.elapsed = Math.round(performance.now() - t1);
      metrics.toolCalls++;
      allToolCalls.push(call);
      callbacks.onToolCall?.(call);
    }

    messages.push({ role: 'user', content: toolResults });

    // Track iterations without render — increment unless a render happened this iteration
    const renderedThisIteration = toolBlocks.some(b =>
      b.name === 'component' || b.name.startsWith('render_')
    );
    if (renderedThisIteration) {
      hasRendered = true;
      iterationsWithoutRender = 0;
    } else {
      iterationsWithoutRender++;
    }

    // Compress old tool results to save context window (benefits both WASM and remote)
    compressOldToolResults(messages, resultBuffer);
  }

  callbacks.onDone?.(metrics);

  return {
    text: lastText,
    toolCalls: allToolCalls,
    metrics,
    stopReason: finishedNormally ? 'end_turn' : 'max_iterations',
    messages,
  };
}

// Helper: convert McpTool[] (from core) to McpToolDef[]
export function fromMcpTools(tools: McpTool[]): McpToolDef[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description ?? '',
    inputSchema: t.inputSchema as Record<string, unknown> | undefined,
  }));
}

/**
 * Trim conversation history to fit within a token budget.
 * Removes oldest message pairs (user+assistant) from the front until under limit.
 * @param history - Full conversation history
 * @param maxTokens - Token budget (1 token ≈ 4 chars)
 */
export function trimConversationHistory(history: ChatMessage[], maxTokens: number): ChatMessage[] {
  const maxChars = maxTokens * 4;
  let total = history.reduce((s, m) => s + JSON.stringify(m).length, 0);
  const trimmed = [...history];
  while (total > maxChars && trimmed.length >= 2) {
    // Skip system messages — only remove user/assistant pairs from the front
    const firstNonSystem = trimmed.findIndex(m => m.role !== 'system');
    if (firstNonSystem < 0 || firstNonSystem + 1 >= trimmed.length) break;
    const removed = trimmed.splice(firstNonSystem, 2);
    total -= removed.reduce((s, m) => s + JSON.stringify(m).length, 0);
  }
  return trimmed;
}
