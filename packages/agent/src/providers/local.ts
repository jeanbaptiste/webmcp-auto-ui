import type { LLMProvider, LLMResponse, ChatMessage, AnthropicTool, ContentBlock } from '../types.js';

export type LocalBackend = 'ollama' | 'llamafile' | 'lm-studio' | string;

export interface LocalLLMProviderOptions {
  baseUrl: string;       // e.g. 'http://localhost:11434' (Ollama) or 'http://localhost:8080' (Llamafile)
  model: string;         // e.g. 'llama3.2', 'mistral', 'phi4-mini'
  backend?: LocalBackend;
}

export class LocalLLMProvider implements LLMProvider {
  readonly name = 'local';
  readonly model: string;
  private baseUrl: string;
  private backend: LocalBackend;

  constructor(options: LocalLLMProviderOptions) {
    this.model = options.model;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.backend = options.backend ?? 'ollama';
  }

  async chat(
    messages: ChatMessage[],
    _tools: AnthropicTool[],
    options?: { signal?: AbortSignal; system?: string }
  ): Promise<LLMResponse> {
    // OpenAI-compatible chat completions endpoint
    const openaiMessages: { role: string; content: string }[] = [];

    if (options?.system) {
      openaiMessages.push({ role: 'system', content: options.system });
    }

    for (const msg of messages) {
      const text = typeof msg.content === 'string'
        ? msg.content
        : (msg.content as ContentBlock[]).filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('\n');
      openaiMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: text });
    }

    const endpoint = this.backend === 'ollama'
      ? `${this.baseUrl}/api/chat`
      : `${this.baseUrl}/v1/chat/completions`;

    const body = this.backend === 'ollama'
      ? { model: this.model, messages: openaiMessages, stream: false }
      : { model: this.model, messages: openaiMessages };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      throw new Error(`Local LLM ${response.status}${txt ? ': ' + txt.slice(0, 200) : ''}`);
    }

    const data = await response.json() as Record<string, unknown>;

    // Ollama: data.message.content; OpenAI: data.choices[0].message.content
    const text = this.backend === 'ollama'
      ? ((data.message as { content?: string })?.content ?? '')
      : (((data.choices as { message: { content?: string } }[])?.[0])?.message?.content ?? '');

    return {
      content: [{ type: 'text', text }],
      stopReason: 'end_turn',
    };
  }
}
