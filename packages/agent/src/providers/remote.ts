import type { LLMProvider, LLMResponse, ChatMessage, AnthropicTool, RemoteModelId, ContentBlock } from '../types.js';

export interface RemoteLLMProviderOptions {
  proxyUrl: string;
  model?: RemoteModelId;
  apiKey?: string;  // injected in body as __apiKey, read by +server.ts proxy
}

export const REMOTE_MODELS: Record<string, string> = {
  'haiku':  'claude-haiku-4-5-20251001',
  'sonnet': 'claude-sonnet-4-6',
  'opus':   'claude-opus-4-6',
};

export class RemoteLLMProvider implements LLMProvider {
  readonly name = 'remote';
  readonly model: string;
  private proxyUrl: string;
  private modelName: string;
  private apiKey?: string;

  constructor(options: RemoteLLMProviderOptions) {
    this.proxyUrl = options.proxyUrl;
    const id = options.model ?? 'haiku';
    this.model = id;
    this.modelName = REMOTE_MODELS[id] ?? id;
    this.apiKey = options.apiKey;
  }

  setModel(id: RemoteModelId) {
    this.modelName = REMOTE_MODELS[id] ?? id;
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
      throw new Error(`Remote LLM API ${response.status}${txt ? ': ' + txt.slice(0, 200) : ''}`);
    }

    const data = await response.json() as {
      content?: ContentBlock[]; stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
    };
    return { content: data.content ?? [], stopReason: data.stop_reason ?? 'end_turn', usage: data.usage };
  }
}
