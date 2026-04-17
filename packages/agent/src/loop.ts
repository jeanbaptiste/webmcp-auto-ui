/**
 * Agent loop — runs LLM → tool call → LLM until end_turn or max iterations
 * Tools are dispatched via the {source}_{protocol}_{tool} naming convention.
 */

import type { McpClient, McpTool } from '@webmcp-auto-ui/core';
import type {
  ChatMessage, ContentBlock, ToolCall, AgentMetrics, AgentResult,
  LLMProvider, ProviderTool, McpToolDef, AgentCallbacks,
} from './types.js';
import type { ToolLayer, SchemaTransformOptions } from './tool-layers.js';
import { buildToolsFromLayers, buildSystemPromptWithAliases, buildDiscoveryToolsWithAliases, buildSystemPrompt, activateServerTools, toProviderTools, sanitizeServerName, flattenPathMaps } from './tool-layers.js';
import type { DiscoveryCache } from './discovery-cache.js';
import { unflattenParams, validateJsonSchema } from '@webmcp-auto-ui/core';
import type { JsonSchema } from '@webmcp-auto-ui/core';
import { autoRepairParams } from './auto-repair.js';
import { PipelineTrace } from './pipeline-trace.js';

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
function compressOldToolResults(messages: ChatMessage[], previewSize: number, resultBuffer?: Map<string, string>): void {
  const threshold = Math.round(previewSize * 1.5);
  for (let i = 0; i < messages.length - 2; i++) {
    const msg = messages[i];
    if (typeof msg.content !== 'string' && Array.isArray(msg.content)) {
      for (let j = 0; j < msg.content.length; j++) {
        const block = msg.content[j];
        if (block.type === 'tool_result' && typeof block.content === 'string' && block.content.length > threshold) {
          const preview = block.content.slice(0, previewSize);
          const totalLen = block.content.length;
          const id = block.tool_use_id;
          if (resultBuffer && resultBuffer.has(id)) {
            (block as any).content = `${preview}... [recall('${id}') for the full result, ${totalLen} chars]`;
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

function truncateResult(result: string, maxLen: number = MAX_RESULT_LEN): string {
  if (result.length <= maxLen) return result;
  try {
    const parsed: unknown = JSON.parse(result);
    if (Array.isArray(parsed)) {
      let sliced = parsed;
      while (JSON.stringify(sliced).length > maxLen && sliced.length > 1) {
        sliced = sliced.slice(0, Math.ceil(sliced.length / 2));
      }
      return JSON.stringify(sliced) + `\n... (truncated, ${parsed.length} items total)`;
    }
  } catch { /* not JSON */ }
  return result.slice(0, maxLen) + '\n... (truncated)';
}

export interface AgentLoopOptions {
  client?: McpClient;           // MCP client — optional if only WebMCP tools used
  provider: LLMProvider;
  /** Structured tool layers (replaces legacy mcpTools) */
  layers?: ToolLayer[];
  maxIterations?: number;
  maxTokens?: number;
  maxTools?: number;
  /** WASM-only: cap on conversation messages sent to the model. Default: derived from contextSize. */
  maxMessages?: number;
  temperature?: number;
  topK?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;
  initialMessages?: ChatMessage[]; // conversation history from previous turns
  callbacks?: AgentCallbacks;
  signal?: AbortSignal;
  /** Truncate tool results to maxResultLength chars (default: true) */
  truncateResults?: boolean;
  /** Compress old tool_result blocks to save context. true = default 200 chars preview, number = custom preview size, false = disabled */
  compressHistory?: boolean | number;
  /** Max length for tool result truncation (default: 10000) */
  maxResultLength?: number;
  /** Schema transform options — sanitize strips complex keywords, flatten simplifies nested objects */
  schemaOptions?: SchemaTransformOptions;
  /** Pre-fetched discovery cache for instant recipe/tool lookups */
  discoveryCache?: DiscoveryCache;
  /** Nano-RAG context compaction — ingest tool results, query before LLM calls */
  contextRAG?: import('./nano-rag/context-rag.js').ContextRAG;
  /** Size of inline residue (chars) left in tool_result after nano-RAG ingestion. 0 = stub only. Default: 200 */
  ragResidueSize?: number;
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
    maxMessages,
    temperature,
    topK,
    cacheEnabled = true,
    initialMessages = [],
    callbacks = {},
    signal,
    truncateResults = true,
    compressHistory = true,
    maxResultLength = MAX_RESULT_LEN,
    schemaOptions,
    discoveryCache,
    contextRAG,
    ragResidueSize = 200,
  } = options;

  // Buffer for recall — stores full tool results keyed by tool_use_id
  const resultBuffer = new Map<string, string>();

  // Build WebMCP server dispatch map from layers
  const webmcpServers = new Map<string, { executeTool: (name: string, params: Record<string, unknown>) => Promise<unknown> }>();
  for (const layer of (options.layers ?? [])) {
    if (layer.protocol === 'webmcp') {
      const toolMap = new Map(layer.tools.map(t => [t.name, t]));
      webmcpServers.set(sanitizeServerName(layer.serverName), {
        executeTool: async (toolName: string, params: Record<string, unknown>) => {
          const tool = toolMap.get(toolName);
          if (!tool) throw new Error(`Tool "${toolName}" not found in WebMCP server "${layer.serverName}"`);
          return tool.execute(params);
        },
      });
    }
  }

  // Start with discovery tools only (lazy loading by server)
  // Use local alias maps (parallel-safe — no global singleton)
  const activatedServers = new Set<string>();
  const localAliasMap = new Map<string, string>();
  const trace = new PipelineTrace();

  const disc = buildDiscoveryToolsWithAliases(options.layers ?? [], schemaOptions, trace);
  let activeTools: ProviderTool[] = disc.tools;
  for (const [k, v] of disc.aliasMap) localAliasMap.set(k, v);

  // Log any trace warnings from initial tool build
  const initTraceSummary = trace.summary();
  if (initTraceSummary) {
    callbacks.onTrace?.(`[pipeline-trace] init\n${initTraceSummary}`);
    trace.clear();
  }

  let baseSystemPrompt: string;
  if (options.systemPrompt) {
    baseSystemPrompt = options.systemPrompt;
  } else {
    const sp = buildSystemPromptWithAliases(options.layers ?? []);
    baseSystemPrompt = sp.prompt;
    for (const [k, v] of sp.aliasMap) localAliasMap.set(k, v);
  }

  const systemPrompt = maxTokens
    ? `${baseSystemPrompt}\n\nIMPORTANT: Limit your responses to ${maxTokens} tokens.`
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
    // Merge into existing user message if the last message is already role=user (to avoid consecutive user messages)
    if (iterationsWithoutRender >= 5 && !hasRendered && !nudgedOnce) {
      nudgedOnce = true;
      const nudgeText = 'STOP exploration. Use the data you already collected. Call widget_display() NOW to display results.';
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        if (typeof lastMsg.content === 'string') {
          lastMsg.content = [{ type: 'text', text: lastMsg.content }, { type: 'text', text: nudgeText }];
        } else if (Array.isArray(lastMsg.content)) {
          (lastMsg.content as ContentBlock[]).push({ type: 'text', text: nudgeText });
        }
      } else {
        messages.push({ role: 'user', content: nudgeText });
      }
    }

    // Nano-RAG: inject relevant context before LLM call
    let iterationSystemPrompt = systemPrompt;
    if (contextRAG && contextRAG.size > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const queryText = typeof lastUserMsg?.content === 'string'
        ? lastUserMsg.content
        : (lastUserMsg?.content as any[])?.find((b: any) => b.type === 'text')?.text ?? '';
      if (queryText) {
        try {
          const ragResults = await contextRAG.query(queryText);
          if (ragResults.length > 0) {
            callbacks.onTrace?.(`[nano-rag] query "${queryText.slice(0, 40)}${queryText.length > 40 ? '…' : ''}" → ${ragResults.length} results (${ragResults.map(r => r.score.toFixed(2)).join(', ')})`);
          }
          const ragContext = await contextRAG.buildContext(queryText);
          if (ragContext) {
            iterationSystemPrompt = iterationSystemPrompt
              ? `${iterationSystemPrompt}\n\n${ragContext}`
              : ragContext;
          }
        } catch { /* RAG failure is non-fatal */ }
      }
    }

    callbacks.onLLMRequest?.(messages, iterationTools);
    const t0 = performance.now();
    let streamingText = '';
    const response = await provider.chat(messages, iterationTools, {
      signal, cacheEnabled, system: iterationSystemPrompt, maxTokens, maxTools, maxMessages, temperature, topK,
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
        messages.push({ role: 'user', content: 'You have not displayed any visual result yet. Call widget_display() with the data you have collected.' });
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

      try {
        let result: string;
        const name = block.name;

        // Resolve alias (canonical name → real tool name) if needed
        const resolvedName = localAliasMap.get(name) ?? name;

        // Parse tool name: {serverName}_{protocol}_{toolName}
        const toolMatch = resolvedName.match(/^(.+?)_(mcp|webmcp)_(.+)$/);

        // ── Discovery cache — resolve search/list/get locally if cached ──
        if (discoveryCache && toolMatch) {
          const cached = discoveryCache.resolve(toolMatch[1], toolMatch[3], block.input as Record<string, unknown>);
          if (cached !== null) {
            result = cached;
            // Store + push result, then continue to next tool block
            resultBuffer.set(block.id, result);
            call.result = result;
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
            call.elapsed = Math.round(performance.now() - t1);
            metrics.toolCalls++;
            allToolCalls.push(call);
            callbacks.onToolCall?.(call);
            continue;
          }
        }

        // ── Intercept list_tools / search_tools (local pseudo-tools) ──
        // These are read-only discovery operations — do NOT activate the server.
        if (toolMatch && (toolMatch[3] === 'list_tools' || toolMatch[3] === 'search_tools')) {
          const [, serverName, protocol, pseudoTool] = toolMatch;
          const layer = (options.layers ?? []).find(l => sanitizeServerName(l.serverName) === serverName && l.protocol === protocol);
          if (!layer) {
            result = 'Error: server not found';
          } else if (pseudoTool === 'list_tools') {
            const tools = layer.tools.map(t => ({ name: t.name, description: t.description, inputSchema: (t as any).inputSchema }));
            result = JSON.stringify(tools, null, 2);
          } else {
            // search_tools — filter by query on name or description
            const query = String((block.input as Record<string, unknown>).query ?? '').toLowerCase();
            const matches = layer.tools.filter(t =>
              t.name.toLowerCase().includes(query) ||
              (t.description ?? '').toLowerCase().includes(query)
            );
            if (matches.length === 0) {
              result = `No tools matching query: ${query}`;
            } else {
              const tools = matches.map(t => ({ name: t.name, description: t.description, inputSchema: (t as any).inputSchema }));
              result = JSON.stringify(tools, null, 2);
            }
          }
        } else {
        // ── Normal tool dispatch — activate server on first contact ──

        // Parse tool name to extract server — activate on first contact
        {
          const activateMatch = resolvedName.match(/^(.+?)_(mcp|webmcp)_(.+)$/);
          if (activateMatch) {
            const [, serverName, protocol] = activateMatch;
            const serverKey = `${serverName}_${protocol}`;
            if (!activatedServers.has(serverKey)) {
              activatedServers.add(serverKey);
              const layer = (options.layers ?? []).find(l => sanitizeServerName(l.serverName) === serverName && l.protocol === protocol);
              if (layer) {
                activeTools = activateServerTools(activeTools, layer, schemaOptions, trace);
              }
            }
          }
        }
        if (!toolMatch) {
          trace.push('dispatch', name, `unknown tool format, expected {source}_{protocol}_{tool}`, 'error');
          result = `Error: unknown tool format "${name}". Expected {source}_{protocol}_{tool}.`;
        } else {
          const [, serverName, protocol, realToolName] = toolMatch;

          // Auto-repair + validate params before dispatch
          let toolInput = block.input as Record<string, unknown>;
          const toolDef = iterationTools.find(t => t.name === block.name);
          if (toolDef?.input_schema) {
            const repair = autoRepairParams(toolInput, toolDef.input_schema, realToolName);
            if (repair.fixes.length > 0) {
              toolInput = repair.params;
              callbacks.onTrace?.(`[auto-repair] ${repair.fixes.join(', ')}`);
              for (const fix of repair.fixes) {
                trace.push('repair', name, fix, 'warn');
              }
            }
            // Validate after repair
            const validation = validateJsonSchema(toolInput, toolDef.input_schema as JsonSchema);
            if (!validation.valid) {
              const errors = validation.errors?.map((e: { message?: string }) => e.message ?? String(e)).join(', ') ?? 'unknown';
              trace.push('validate', name, errors, 'error');
              result = `Validation error: ${errors}. Expected schema: ${JSON.stringify(toolDef.input_schema)}`;
              // Push error as tool_result and skip to next block
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
              call.result = result;
              call.elapsed = Math.round(performance.now() - t1);
              metrics.toolCalls++;
              allToolCalls.push(call);
              callbacks.onToolCall?.(call);
              continue;
            }
          }

          if (protocol === 'mcp') {
            // Route to MCP client
            if (!client) {
              result = `Error: no MCP client available for tool ${name}`;
            } else {
              const mcpResult = await client.callTool(realToolName, toolInput);
              const textContent = mcpResult.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined;
              const rawResult = textContent?.text ?? JSON.stringify(mcpResult);
              result = truncateResults ? truncateResult(rawResult, maxResultLength) : rawResult;
            }
          } else if (protocol === 'webmcp') {
            // Intercept recall BEFORE hitting executeTool — use the local resultBuffer directly
            if (realToolName === 'recall' && resultBuffer.size > 0) {
              const recallId = (toolInput as { id: string }).id;
              result = resultBuffer.get(recallId) ?? `No result found for id '${recallId}'.`;
            } else {
              // Route to WebMCP server
              const webmcpServer = webmcpServers.get(serverName);
              if (!webmcpServer) {
                result = `Error: no WebMCP server "${serverName}" found.`;
              } else {
                // Unflatten params if schema was flattened
                if (schemaOptions?.flatten) {
                  const pathMap = flattenPathMaps.get(block.name);
                  if (pathMap) {
                    toolInput = unflattenParams(toolInput, pathMap);
                  }
                }
                const toolResult = await webmcpServer.executeTool(realToolName, toolInput);
                result = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);

                // Special handling for widget_display — notify via onWidget callback
                if (realToolName === 'widget_display' && typeof toolResult === 'object' && toolResult !== null) {
                  const wr = toolResult as Record<string, unknown>;
                  if (wr.widget && wr.data && !wr.error) {
                    const widgetResult = callbacks.onWidget?.(wr.widget as string, wr.data as Record<string, unknown>, serverName);
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
                    case 'clear':
                      callbacks.onClear?.();
                      // Strip old widget_display / render_* tool calls AND their
                      // matching tool_result blocks from the messages array so the
                      // LLM no longer sees them in context and cannot re-create
                      // the cleared widgets.
                      {
                        const strippedIds = new Set<string>();
                        // Pass 1: collect IDs of widget tool_use blocks
                        for (const msg of messages) {
                          if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue;
                          for (const b of msg.content as ContentBlock[]) {
                            if (b.type !== 'tool_use') continue;
                            const tu = b as { type: 'tool_use'; id: string; name: string };
                            if (tu.name.includes('widget_display') || tu.name.startsWith('render_')) {
                              strippedIds.add(tu.id);
                            }
                          }
                        }
                        // Pass 2: strip tool_use and matching tool_result blocks
                        if (strippedIds.size > 0) {
                          for (const msg of messages) {
                            if (!Array.isArray(msg.content)) continue;
                            msg.content = (msg.content as ContentBlock[]).filter(b => {
                              if (b.type === 'tool_use') {
                                return !strippedIds.has((b as { type: 'tool_use'; id: string }).id);
                              }
                              if (b.type === 'tool_result') {
                                return !strippedIds.has((b as { type: 'tool_result'; tool_use_id: string }).tool_use_id);
                              }
                              return true;
                            });
                          }
                          // Remove messages with empty content arrays (orphaned after stripping)
                          let i = messages.length;
                          while (i-- > 0) {
                            const c = messages[i].content;
                            if (Array.isArray(c) && c.length === 0) messages.splice(i, 1);
                          }
                        }
                        hasRendered = false;
                      }
                      break;
                    case 'update': callbacks.onUpdate?.(id, actionParams ?? {}); break;
                    case 'move': callbacks.onMove?.(id, (actionParams?.x ?? (block.input as any).x) as number, (actionParams?.y ?? (block.input as any).y) as number); break;
                    case 'resize': callbacks.onResize?.(id, (actionParams?.width ?? (block.input as any).width) as number, (actionParams?.height ?? (block.input as any).height) as number); break;
                    case 'style': callbacks.onStyle?.(id, (actionParams?.styles ?? (block.input as any).styles) as Record<string, string>); break;
                  }
                }
              }
            }
          } else {
            result = `Error: unknown protocol "${protocol}" in tool "${name}".`;
          }
        }
        } // end else (normal dispatch, not list_tools/search_tools)

        // Store full result in buffer for later recall
        resultBuffer.set(block.id, result);

        // Nano-RAG: ingest tool result and replace with compact stub
        let compactedResult = result;
        if (contextRAG && result && !isDiscoveryTool(block.name)) {
          const realName = toolMatch ? toolMatch[3] : block.name;
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          const lastUserText = [...messages].reverse()
            .find(m => m.role === 'user')?.content;
          const userQuery = typeof lastUserText === 'string'
            ? lastUserText
            : (lastUserText as any[])?.find((b: any) => b.type === 'text')?.text ?? '';
          try {
            const chunkCount = await contextRAG.ingest(realName, block.id, resultStr, userQuery);
            if (chunkCount > 0) {
              callbacks.onTrace?.(`[nano-rag] ingested ${chunkCount} chunks from ${realName} (${resultStr.length} chars)`);
              // Replace with compact stub — full data retrievable via RAG query
              const residue = ragResidueSize > 0 ? resultStr.slice(0, ragResidueSize) : '';
              compactedResult = residue
                ? `${residue}… [${resultStr.length} chars ingested into RAG]`
                : `[${resultStr.length} chars ingested into RAG — query context for details]`;
            }
          } catch { /* RAG failure is non-fatal — keep full result */ }
        }

        call.result = result;
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: compactedResult });
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

    // Flush pipeline trace warnings to agent console
    const traceSummary = trace.summary();
    if (traceSummary) {
      callbacks.onTrace?.(`[pipeline-trace]\n${traceSummary}`);
      trace.clear();
    }

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
    if (compressHistory) {
      const previewSize = typeof compressHistory === 'number' ? compressHistory : 200;
      compressOldToolResults(messages, previewSize, resultBuffer);
    }
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

  // Remove orphaned tool_result messages at the start — these reference
  // a tool_use in a message that was trimmed away, causing API errors.
  while (trimmed.length > 0) {
    const first = trimmed[0];
    if (first.role === 'system') break; // preserve system messages at the front
    const blocks = Array.isArray(first.content) ? first.content : [];
    const hasToolResult = blocks.some((b: any) => b.type === 'tool_result');
    if (hasToolResult) {
      trimmed.shift();
    } else {
      break;
    }
  }

  // Ensure the first non-system message is role=user (API requirement)
  while (trimmed.length > 0) {
    const firstNonSystem = trimmed.findIndex(m => m.role !== 'system');
    if (firstNonSystem >= 0 && trimmed[firstNonSystem].role === 'assistant') {
      trimmed.splice(firstNonSystem, 1);
    } else {
      break;
    }
  }

  return trimmed;
}
