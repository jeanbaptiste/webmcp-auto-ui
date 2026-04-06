import type { LLMProvider, LLMResponse, ChatMessage, AnthropicTool, ModelId, ContentBlock } from '../types.js';

export interface AnthropicProviderOptions {
  proxyUrl: string;
  model?: string;
  apiKey?: string;  // injected in body as __apiKey, read by +server.ts proxy
}

const MODELS: Record<string, string> = {
  'claude-haiku':  'claude-haiku-4-5-20251001',
  'claude-sonnet': 'claude-sonnet-4-6',
};

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: ModelId = 'claude-haiku';
  private proxyUrl: string;
  private modelName: string;
  private apiKey?: string;

  constructor(options: AnthropicProviderOptions) {
    this.proxyUrl = options.proxyUrl;
    this.modelName = options.model ?? MODELS['claude-haiku'];
    this.apiKey = options.apiKey;
  }

  setModel(id: ModelId) {
    if (MODELS[id]) this.modelName = MODELS[id];
  }

  async chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: { signal?: AbortSignal; cacheEnabled?: boolean; system?: string }
  ): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.modelName,
      max_tokens: 4096,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      ...(this.apiKey ? { __apiKey: this.apiKey } : {}),
    };

    if (options?.system) {
      body.system = options.cacheEnabled
        ? [{ type: 'text', text: options.system, cache_control: { type: 'ephemeral' } }]
        : options.system;
    }

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Model': this.modelName },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      throw new Error(`Anthropic API ${response.status}${txt ? ': ' + txt.slice(0, 200) : ''}`);
    }

    const data = await response.json() as {
      content?: ContentBlock[]; stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
    };
    return { content: data.content ?? [], stopReason: data.stop_reason ?? 'end_turn', usage: data.usage };
  }
}
