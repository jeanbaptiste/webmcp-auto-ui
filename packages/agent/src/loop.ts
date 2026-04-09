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
import { formatRecipesForPrompt, formatMcpRecipesForPrompt } from './recipe-registry.js';

const MAX_RESULT_LEN = 10_000;

/** Build system prompt from structured ToolLayers (new API) */
export function buildSystemPrompt(layers: ToolLayer[]): string;
/** Build system prompt from flat McpToolDef[] (backward compat) */
export function buildSystemPrompt(mcpTools: McpToolDef[]): string;
export function buildSystemPrompt(input: ToolLayer[] | McpToolDef[]): string {
  // Detect: is it ToolLayer[] or McpToolDef[]?
  if (input.length > 0 && 'source' in input[0]) {
    return buildSystemPromptFromLayers(input as ToolLayer[]);
  }
  // Legacy path — McpToolDef[]
  return buildSystemPromptLegacy(input as McpToolDef[]);
}

function buildSystemPromptLegacy(mcpTools: McpToolDef[]): string {
  const dataTools = mcpTools.filter(t => !isUITool(t.name));
  const uiTools = UI_TOOLS;
  return `You are a UI composer connected to an MCP server.
You have ${dataTools.length} DATA tools and ${uiTools.length} UI tools.

DATA tools (query data):
${dataTools.map(t => `- ${t.name}: ${(t.description ?? t.name).split('\n')[0]}`).join('\n')}

UI tools (render results visually):
${uiTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

MANDATORY WORKFLOW — follow this EXACTLY:
1. Call ONE data tool to get data
2. IMMEDIATELY call a render_* UI tool to display the result — even if partial or imperfect
3. Repeat steps 1-2 if the user wants more data, otherwise stop

CRITICAL RULES:
- After EVERY data tool call, you MUST call a render_* tool next — no exceptions
- If a query returns an error or empty data, call render_kv or render_stat to show the status
- NEVER chain more than 1 data tool call without rendering in between
- ALWAYS render — never just return text
- Use render_table for tabular data, render_chart for numbers, render_stat for KPIs, render_kv for key-value pairs
- Keep text responses to 1 sentence max
- Respond in the user's language`;
}

function buildSystemPromptFromLayers(layers: ToolLayer[]): string {
  let prompt = `You are a UI composer connected to MCP servers.

MANDATORY WORKFLOW:
1. Call a DATA tool to get data
2. IMMEDIATELY call a render_* UI tool to display the result
3. Repeat or stop
CRITICAL: After EVERY data tool, render next. ALWAYS render. Keep text to 1 sentence.
Respond in the user's language.

`;

  // ## mcp — from McpLayers
  const mcpLayers = layers.filter((l): l is McpLayer => l.source === 'mcp');
  const allMcpTools = mcpLayers.flatMap(l => l.tools).filter(t => !isUITool(t.name));
  const allMcpRecipes = mcpLayers.flatMap(l => l.recipes ?? []);

  if (allMcpTools.length > 0) {
    const serverNames = mcpLayers
      .filter(l => l.serverName)
      .map(l => l.serverName!);
    prompt += `## mcp${serverNames.length ? ' (' + serverNames.join(', ') + ')' : ''}\n\n`;
    prompt += `### tools (${allMcpTools.length} DATA tools)\n`;
    prompt += allMcpTools.map(t =>
      `- ${t.name}: ${(t.description ?? t.name).split('\n')[0]}`
    ).join('\n');
    prompt += '\n\n';

    if (allMcpRecipes.length > 0) {
      prompt += `### recipes (${allMcpRecipes.length} server recipes)\n`;
      prompt += formatMcpRecipesForPrompt(allMcpRecipes);
      prompt += '\n\n';
    }
  }

  // ## webmcp — from UILayer
  const uiLayer = layers.find((l): l is UILayer => l.source === 'ui');
  if (uiLayer) {
    prompt += `## webmcp\n\n`;
    prompt += `### UI tools (render results visually)\n`;
    prompt += UI_TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n');
    prompt += '\n\n';

    prompt += `RULES:\n`;
    prompt += `- After EVERY data tool call, MUST call a render_* tool next\n`;
    prompt += `- render_table for tabular data, render_chart for numbers, render_stat for KPIs, render_kv for key-value pairs\n`;
    prompt += `- If error/empty data, call render_kv or render_stat to show the status\n`;
    prompt += `- NEVER chain >1 data tool without rendering in between\n\n`;

    if (uiLayer.recipes && uiLayer.recipes.length > 0) {
      prompt += `### recipes (${uiLayer.recipes.length} UI recipes)\n`;
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
    maxIterations = 5,
    maxTokens,
    temperature,
    topK,
    cacheEnabled = true,
    initialMessages = [],
    callbacks = {},
    signal,
  } = options;

  const allTools: AnthropicTool[] = [
    ...mcpToolsToAnthropic(mcpTools),
    ...UI_TOOLS,
  ];

  const baseSystemPrompt = options.systemPrompt ?? buildSystemPrompt(mcpTools);
  const systemPrompt = maxTokens
    ? `${baseSystemPrompt}\n\nIMPORTANT: Keep responses under ${maxTokens} tokens.`
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

        if (isUITool(block.name)) {
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
