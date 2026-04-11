/**
 * Agent loop — runs LLM → tool call → LLM until end_turn or max iterations
 * Tools are dispatched via the {source}_{protocol}_{tool} naming convention.
 */

import type { McpClient, McpTool } from '@webmcp-auto-ui/core';
import type {
  ChatMessage, ContentBlock, ToolCall, AgentMetrics, AgentResult,
  LLMProvider, ProviderTool, McpToolDef, AgentCallbacks,
} from './types.js';
import type { ToolLayer } from './tool-layers.js';
import { buildToolsFromLayers, buildSystemPrompt, buildDiscoveryTools, activateServerTools, toProviderTools, toolAliasMap } from './tool-layers.js';

// Re-export buildSystemPrompt for backward compat
export { buildSystemPrompt } from './tool-layers.js';

const MAX_RESULT_LEN = 10_000;

/** Tool names (after prefix strip) that indicate discovery/exploration */
const DISCOVERY_TOOL_NAMES = new Set([
  'search_recipes', 'get_recipe', 'list_recipes', 'list_tables', 'describe_table',
  'get_json_schemas', 'get_typescript_types', 'recall',
]);

function isDiscoveryTool(prefixedName: string): boolean {
  const match = prefixedName.match(/^.+?_(mcp|webmcp)_(.+)$/);
  if (!match) return false;
  return DISCOVERY_TOOL_NAMES.has(match[2]);
}

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

// Re-export toProviderTools
export { toProviderTools };
/** @deprecated Use toProviderTools */
export const mcpToolsToAnthropic = toProviderTools;

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
  client?: McpClient;           // MCP client — optional if only WebMCP tools used
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
  } = options;

  // Buffer for recall — stores full tool results keyed by tool_use_id
  const resultBuffer = new Map<string, string>();

  // Build WebMCP server dispatch map from layers
  const webmcpServers = new Map<string, { executeTool: (name: string, params: Record<string, unknown>) => Promise<unknown> }>();
  for (const layer of (options.layers ?? [])) {
    if (layer.protocol === 'webmcp') {
      const toolMap = new Map(layer.tools.map(t => [t.name, t]));
      webmcpServers.set(layer.serverName, {
        executeTool: async (toolName: string, params: Record<string, unknown>) => {
          const tool = toolMap.get(toolName);
          if (!tool) throw new Error(`Tool "${toolName}" not found in WebMCP server "${layer.serverName}"`);
          return tool.execute(params);
        },
      });
    }
  }

  // Start with discovery tools only (lazy loading by server)
  const activatedServers = new Set<string>();
  let activeTools: ProviderTool[] = buildDiscoveryTools(options.layers ?? []);
  const baseSystemPrompt: string = options.systemPrompt ?? buildSystemPrompt(options.layers ?? []);

  const systemPrompt = maxTokens
    ? `${baseSystemPrompt}\n\nIMPORTANT : Limite tes réponses à ${maxTokens} tokens.`
    : baseSystemPrompt;

  const messages: ChatMessage[] = [
    ...initialMessages.map(m => ({
      ...m,
      content: Array.isArray(m.content) ? m.content.map(b => ({ ...b })) : m.content,
    })),
    { role: 'user', content: userMessage },
  ];

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

    // After 4+ iterations without render, strip discovery tools to force rendering
    let iterationTools = activeTools;
    if (iterationsWithoutRender >= 4 && !hasRendered) {
      iterationTools = activeTools.filter(t => !isDiscoveryTool(t.name));
    }

    // After 5+ iterations without render, inject a nudge message (once)
    if (iterationsWithoutRender >= 5 && !hasRendered && !nudgedOnce) {
      nudgedOnce = true;
      messages.push({
        role: 'user',
        content: 'STOP exploration. Use the data you already collected. Call widget_display() NOW to display results.',
      });
    }

    callbacks.onLLMRequest?.(messages, iterationTools);
    const t0 = performance.now();
    let streamingText = '';
    const response = await provider.chat(messages, iterationTools, {
      signal, cacheEnabled, system: systemPrompt, maxTokens, maxTools, temperature, topK,
      onToken: callbacks.onToken ? (token) => {
        callbacks.onToken!(token);
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
      // If no tool calls and nothing rendered yet, nudge the LLM to render (once)
      if (!hasRendered && !nudgedOnce && metrics.toolCalls > 0) {
        nudgedOnce = true;
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: 'Tu n\'as pas encore affiché de résultat visuel. Appelle widget_display() avec les données que tu as récoltées.' });
        continue;
      }
      messages.push({ role: 'assistant', content: response.content });
      callbacks.onText?.(lastText);
      finishedNormally = true;
      break;
    }

    // Intermediate text (reasoning/commentary before tool_use) — live update
    if (lastText) callbacks.onText?.(lastText);

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: ContentBlock[] = [];
    for (const block of toolBlocks) {
      const call: ToolCall = { id: block.id, name: block.name, args: block.input };
      const wasDiscovering = discoveryPhase;
      if (isDiscoveryTool(block.name)) {
        discoveryPhase = true;
        call.guided = false;
      } else {
        call.guided = wasDiscovering;
        discoveryPhase = false;
      }
      const t1 = performance.now();

      // Parse tool name to extract server — activate on first contact
      {
        const activateMatch = block.name.match(/^(.+?)_(mcp|webmcp)_(.+)$/);
        if (activateMatch) {
          const [, serverName, protocol] = activateMatch;
          const serverKey = `${serverName}_${protocol}`;
          if (!activatedServers.has(serverKey)) {
            activatedServers.add(serverKey);
            const layer = (options.layers ?? []).find(l => l.serverName === serverName && l.protocol === protocol);
            if (layer) {
              activeTools = activateServerTools(activeTools, layer);
            }
          }
        }
      }

      try {
        let result: string;
        const name = block.name;

        // Resolve alias (canonical name → real tool name) if needed
        const resolvedName = toolAliasMap.get(name) ?? name;

        // Parse tool name: {serverName}_{protocol}_{toolName}
        const toolMatch = resolvedName.match(/^(.+?)_(mcp|webmcp)_(.+)$/);
        if (!toolMatch) {
          result = `Error: unknown tool format "${name}". Expected {source}_{protocol}_{tool}.`;
        } else {
          const [, serverName, protocol, realToolName] = toolMatch;

          if (protocol === 'mcp') {
            // Route to MCP client
            if (!client) {
              result = `Error: no MCP client available for tool ${name}`;
            } else {
              const mcpResult = await client.callTool(realToolName, block.input);
              const textContent = mcpResult.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined;
              result = truncateResult(textContent?.text ?? JSON.stringify(mcpResult));
            }
          } else if (protocol === 'webmcp') {
            // Route to WebMCP server
            const webmcpServer = webmcpServers.get(serverName);
            if (!webmcpServer) {
              result = `Error: no WebMCP server "${serverName}" found.`;
            } else {
              const toolResult = await webmcpServer.executeTool(realToolName, block.input);
              result = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

              // Special handling for widget_display — notify via onWidget callback
              if (realToolName === 'widget_display' && typeof toolResult === 'object' && toolResult !== null) {
                const wr = toolResult as Record<string, unknown>;
                if (wr.widget && wr.data && !wr.error) {
                  const widgetResult = callbacks.onWidget?.(wr.widget as string, wr.data as Record<string, unknown>);
                  if (widgetResult?.id) {
                    result = JSON.stringify({ ...wr, id: widgetResult.id });
                  }
                }
              }

              // Special handling for canvas tool — route to callbacks
              if (realToolName === 'canvas') {
                const action = (block.input as Record<string, unknown>).action as string;
                const id = (block.input as Record<string, unknown>).id as string;
                const actionParams = (block.input as Record<string, unknown>).params as Record<string, unknown> | undefined;
                switch (action) {
                  case 'clear': callbacks.onClear?.(); break;
                  case 'update': callbacks.onUpdate?.(id, actionParams ?? {}); break;
                  case 'move': callbacks.onMove?.(id, (actionParams?.x ?? (block.input as any).x) as number, (actionParams?.y ?? (block.input as any).y) as number); break;
                  case 'resize': callbacks.onResize?.(id, (actionParams?.width ?? (block.input as any).width) as number, (actionParams?.height ?? (block.input as any).height) as number); break;
                  case 'style': callbacks.onStyle?.(id, (actionParams?.styles ?? (block.input as any).styles) as Record<string, string>); break;
                }
              }

              // Special handling for recall — use the resultBuffer
              if (realToolName === 'recall') {
                const recallId = (block.input as { id: string }).id;
                result = resultBuffer.get(recallId) ?? `Aucun résultat trouvé pour l'id '${recallId}'.`;
              }
            }
          } else {
            result = `Error: unknown protocol "${protocol}" in tool "${name}".`;
          }
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

    // Track iterations without render — widget_display means a render happened
    const renderedThisIteration = toolBlocks.some(b => {
      const match = b.name.match(/^.+?_(mcp|webmcp)_(.+)$/);
      return match && match[2] === 'widget_display';
    });
    if (renderedThisIteration) {
      hasRendered = true;
      iterationsWithoutRender = 0;
    } else {
      iterationsWithoutRender++;
    }

    // Compress old tool results to save context window
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
    const firstNonSystem = trimmed.findIndex(m => m.role !== 'system');
    if (firstNonSystem < 0 || firstNonSystem + 1 >= trimmed.length) break;
    const removed = trimmed.splice(firstNonSystem, 2);
    total -= removed.reduce((s, m) => s + JSON.stringify(m).length, 0);
  }
  return trimmed;
}
