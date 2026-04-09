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
import type { ToolLayer, McpLayer, UILayer } from './tool-layers.js';
import { UI_TOOLS, isUITool, executeUITool } from './ui-tools.js';
import { COMPONENT_TOOL, executeComponent } from './component-tool.js';
import { formatRecipesForPrompt, formatMcpRecipesForPrompt } from './recipe-registry.js';

const MAX_RESULT_LEN = 10_000;

/** Build system prompt from structured ToolLayers (new API) */
export function buildSystemPrompt(layers: ToolLayer[], options?: { toolMode?: 'smart' | 'explicit' }): string;
/** Build system prompt from flat McpToolDef[] (backward compat) */
export function buildSystemPrompt(mcpTools: McpToolDef[]): string;
export function buildSystemPrompt(input: ToolLayer[] | McpToolDef[], options?: { toolMode?: 'smart' | 'explicit' }): string {
  // Detect: is it ToolLayer[] or McpToolDef[]?
  if (input.length === 0 || 'source' in input[0]) {
    return buildSystemPromptFromLayers(input as ToolLayer[], options?.toolMode ?? 'smart');
  }
  // Legacy path — McpToolDef[]
  return buildSystemPromptLegacy(input as McpToolDef[]);
}

function buildSystemPromptLegacy(mcpTools: McpToolDef[]): string {
  const dataTools = mcpTools.filter(t => !isUITool(t.name));
  const uiTools = UI_TOOLS;
  return `Tu es un assistant UI connecté à un serveur MCP.
Tu as ${dataTools.length} outils DATA et ${uiTools.length} outils UI.

Outils DATA (requêtes) :
${dataTools.map(t => `- ${t.name}: ${(t.description ?? t.name).split('\n')[0]}`).join('\n')}

Outils UI (affichage visuel) :
${uiTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

WORKFLOW OBLIGATOIRE :
1. Appelle un outil DATA pour récupérer les données
2. Appelle IMMÉDIATEMENT un outil UI (render_*) pour afficher le résultat
3. Recommence ou arrête

RÈGLES :
- Après CHAQUE outil DATA, appeler un render_* obligatoirement
- Si erreur ou données vides, appeler render_kv ou render_stat pour montrer le statut
- JAMAIS enchaîner >1 outil DATA sans rendre entre les deux
- TOUJOURS rendre visuellement — jamais que du texte
- render_table pour les tableaux, render_chart pour les chiffres, render_stat pour les KPIs, render_kv pour les paires clé-valeur
- Texte = 1 phrase max`;
}

function buildSystemPromptFromLayers(layers: ToolLayer[], toolMode: 'smart' | 'explicit'): string {
  const componentCall = toolMode === 'smart'
    ? 'component("nom", {params})'
    : 'un outil UI (render_* ou component)';

  let prompt = `Tu es un assistant UI connecté à des serveurs MCP.

WORKFLOW OBLIGATOIRE :
1. Appelle un outil DATA pour récupérer les données
2. Appelle IMMÉDIATEMENT ${componentCall} pour afficher le résultat
3. Recommence ou arrête
CRITIQUE : Après CHAQUE outil DATA, rends visuellement. TOUJOURS rendre. Texte = 1 phrase max.

`;

  // ## mcp — depuis les McpLayers
  const mcpLayers = layers.filter((l): l is McpLayer => l.source === 'mcp');
  const allMcpTools = mcpLayers.flatMap(l => l.tools).filter(t => !isUITool(t.name));
  const allMcpRecipes = mcpLayers.flatMap(l => l.recipes ?? []);

  if (allMcpTools.length > 0) {
    const serverNames = mcpLayers
      .filter(l => l.serverName)
      .map(l => l.serverName!);
    prompt += `## mcp${serverNames.length ? ' (' + serverNames.join(', ') + ')' : ''}\n\n`;
    prompt += `### outils DATA (${allMcpTools.length})\n`;
    prompt += allMcpTools.map(t =>
      `- ${t.name}: ${(t.description ?? t.name).split('\n')[0]}`
    ).join('\n');
    prompt += '\n\n';

    if (allMcpRecipes.length > 0) {
      prompt += `### recettes serveur (${allMcpRecipes.length})\n`;
      prompt += formatMcpRecipesForPrompt(allMcpRecipes);
      prompt += '\n\n';
    }
  }

  // ## webmcp — depuis UILayer
  const uiLayer = layers.find((l): l is UILayer => l.source === 'ui');
  if (uiLayer) {
    prompt += `## webmcp\n\n`;

    if (toolMode === 'smart') {
      // Mode smart : component() est le seul outil UI
      prompt += `### component() — seul outil UI\n`;
      prompt += `Appelle component("nom", {params}) pour rendre un composant.\n`;
      prompt += `Appelle component("help", "nom") pour le schéma détaillé.\n\n`;
      prompt += `Composants disponibles : `;
      // Liste compacte des noms + 1 mot
      const seen = new Set<string>();
      const names: string[] = [];
      for (const t of UI_TOOLS) {
        if (t.name.startsWith('render_')) {
          const short = t.name.slice(7).replace(/_/g, '-');
          if (!seen.has(short)) { seen.add(short); names.push(short); }
        }
      }
      prompt += names.join(', ');
      prompt += `\nCanvas : clear, update, move, resize, style\n\n`;
    } else {
      // Mode explicit : 31 outils individuels
      prompt += `### outils UI (affichage visuel)\n`;
      prompt += UI_TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n');
      prompt += '\n\n';
    }

    prompt += `RÈGLES :\n`;
    prompt += `- Après CHAQUE outil DATA, rendre visuellement obligatoirement\n`;
    prompt += `- table pour les tableaux, chart pour les chiffres, stat pour les KPIs, kv pour les paires clé-valeur\n`;
    prompt += `- Si erreur ou données vides, rendre kv ou stat pour montrer le statut\n`;
    prompt += `- JAMAIS enchaîner >1 outil DATA sans rendre entre les deux\n\n`;

    if (uiLayer.recipes && uiLayer.recipes.length > 0) {
      prompt += `### recettes UI (${uiLayer.recipes.length})\n`;
      prompt += formatRecipesForPrompt(uiLayer.recipes);
      prompt += '\n';
    }
  }

  return prompt.trimEnd();
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
  mcpTools?: McpToolDef[];      // tools from MCP server
  /** 'smart' = 1 tool component() (default), 'explicit' = 31 render_* + component() */
  toolMode?: 'smart' | 'explicit';
  maxIterations?: number;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;
  initialMessages?: ChatMessage[]; // conversation history from previous turns
  callbacks?: AgentCallbacks;
  signal?: AbortSignal;
}

export async function runAgentLoop(
  userMessage: string,
  options: AgentLoopOptions
): Promise<AgentResult> {
  const {
    client,
    provider,
    mcpTools = [],
    toolMode = 'smart',
    maxIterations = 5,
    maxTokens,
    temperature,
    topK,
    cacheEnabled = true,
    initialMessages = [],
    callbacks = {},
    signal,
  } = options;

  const mcpToolsDef = mcpToolsToAnthropic(mcpTools);
  const allTools: AnthropicTool[] = toolMode === 'smart'
    ? [...mcpToolsDef, COMPONENT_TOOL]
    : [...mcpToolsDef, ...UI_TOOLS, COMPONENT_TOOL];

  const baseSystemPrompt = options.systemPrompt ?? buildSystemPromptLegacy(mcpTools);
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

  for (let i = 0; i < maxIterations; i++) {
    if (signal?.aborted) break;
    metrics.iterations++;
    callbacks.onIterationStart?.(i + 1, maxIterations);

    callbacks.onLLMRequest?.(messages, allTools);
    const t0 = performance.now();
    let streamingText = '';
    const response = await provider.chat(messages, allTools, {
      signal, cacheEnabled, system: systemPrompt, maxTokens, temperature, topK,
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
      const t1 = performance.now();

      try {
        let result: string;

        if (block.name === 'component') {
          result = executeComponent(block.input as { name: string; params?: unknown }, callbacks);
        } else if (isUITool(block.name)) {
          result = executeUITool(block.name, block.input, callbacks);
        } else if (client) {
          const mcpResult = await client.callTool(block.name, block.input);
          const textContent = mcpResult.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined;
          result = truncateResult(textContent?.text ?? JSON.stringify(mcpResult));
        } else {
          result = `Error: no MCP client available for tool ${block.name}`;
        }

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
    const removed = trimmed.splice(0, 2);
    total -= removed.reduce((s, m) => s + JSON.stringify(m).length, 0);
  }
  return trimmed;
}
