import type { LLMProvider, LLMResponse, ChatMessage, ProviderTool, ContentBlock } from '../types.js';

export interface HawkLLMProviderOptions {
  proxyUrl: string;   // SvelteKit proxy endpoint, e.g. '/api/hawk'
  model: string;      // e.g. 'qwen35-2b' (ID Hawk sans préfixe)
}

// ── OpenAI-compatible types ─────────────────────────────────────────

interface OaiTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

interface OaiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

interface OaiChoice {
  message: {
    content?: string | null;
    tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  };
  finish_reason: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

let _counter = 0;
function hawkId(): string {
  return 'hawk_' + (++_counter).toString(36) + '_' + Date.now().toString(36);
}

function toOaiTools(tools: ProviderTool[]): OaiTool[] {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

function toOaiMessages(messages: ChatMessage[], system?: string): OaiMessage[] {
  const out: OaiMessage[] = [];

  if (system) out.push({ role: 'system', content: system });

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
      continue;
    }

    const blocks = msg.content as ContentBlock[];
    const textParts = blocks.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text);
    const toolUses = blocks.filter(b => b.type === 'tool_use') as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }[];
    const toolResults = blocks.filter(b => b.type === 'tool_result') as { type: 'tool_result'; tool_use_id: string; content: string }[];

    if (msg.role === 'assistant') {
      const oai: OaiMessage = { role: 'assistant', content: textParts.join('\n') || null };
      if (toolUses.length > 0) {
        oai.tool_calls = toolUses.map(tu => ({
          id: tu.id,
          type: 'function' as const,
          function: { name: tu.name, arguments: JSON.stringify(tu.input) },
        }));
      }
      out.push(oai);
    } else {
      // User turn — may contain tool_result blocks (sent back after assistant tool_use)
      for (const tr of toolResults) {
        out.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: tr.content });
      }
      if (textParts.length > 0) {
        out.push({ role: 'user', content: textParts.join('\n') });
      }
      // If only tool_results and no text, we've already pushed them
      if (toolResults.length === 0 && textParts.length === 0) {
        out.push({ role: 'user', content: '' });
      }
    }
  }
  return out;
}

function parseArguments(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return { _raw: raw }; }
}

// ── Provider ────────────────────────────────────────────────────────

export class HawkProvider implements LLMProvider {
  readonly name = 'hawk';
  readonly model: string;
  private proxyUrl: string;

  constructor(options: HawkLLMProviderOptions) {
    this.model = options.model;
    this.proxyUrl = options.proxyUrl;
  }

  async chat(
    messages: ChatMessage[],
    tools: ProviderTool[],
    options?: { signal?: AbortSignal; system?: string; maxTokens?: number; temperature?: number },
  ): Promise<LLMResponse> {
    const oaiMessages = toOaiMessages(messages, options?.system);
    const oaiTools = tools.length > 0 ? toOaiTools(tools) : undefined;

    // NOTE: `model` is NOT sent in the body — the server proxy injects it
    // from the X-Model header into the upstream Hawk request.
    const body: Record<string, unknown> = {
      messages: oaiMessages,
      stream: false,
    };
    if (oaiTools) body.tools = oaiTools;
    if (options?.maxTokens) body.max_tokens = options.maxTokens;
    if (options?.temperature != null) body.temperature = options.temperature;

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Model': this.model,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      throw new Error(`Hawk LLM ${response.status}${txt ? ': ' + txt.slice(0, 200) : ''}`);
    }

    const data = await response.json() as { choices?: OaiChoice[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const choice = data.choices?.[0];
    if (!choice) throw new Error('Hawk LLM returned no choices');

    const content: ContentBlock[] = [];
    const toolCalls = choice.message.tool_calls;

    if (choice.message.content) {
      content.push({ type: 'text', text: choice.message.content });
    }

    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        content.push({
          type: 'tool_use',
          id: tc.id || hawkId(),
          name: tc.function.name,
          input: parseArguments(tc.function.arguments),
        });
      }
    }

    // Ensure at least one block
    if (content.length === 0) {
      content.push({ type: 'text', text: '' });
    }

    const hasToolUse = content.some(b => b.type === 'tool_use');
    const stopReason = hasToolUse ? 'tool_use'
      : choice.finish_reason === 'tool_calls' ? 'tool_use'
      : 'end_turn';

    return {
      content,
      stopReason,
      usage: data.usage ? {
        input_tokens: data.usage.prompt_tokens ?? 0,
        output_tokens: data.usage.completion_tokens ?? 0,
      } : undefined,
    };
  }
}
