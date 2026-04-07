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
import { UI_TOOLS, isUITool, executeUITool } from './ui-tools.js';

const MAX_RESULT_LEN = 10_000;

export function buildSystemPrompt(mcpTools: McpToolDef[]): string {
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
  cacheEnabled?: boolean;
  systemPrompt?: string;
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
    cacheEnabled = true,
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

  const messages: ChatMessage[] = [{ role: 'user', content: userMessage }];

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
    const response = await provider.chat(messages, allTools, {
      signal, cacheEnabled, system: systemPrompt,
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
