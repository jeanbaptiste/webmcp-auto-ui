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
  model: string;
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
    this.model = id;
    this.modelName = REMOTE_MODELS[id] ?? id;
  }

  async chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: { signal?: AbortSignal; cacheEnabled?: boolean; system?: string; maxTokens?: number; temperature?: number; topK?: number }
  ): Promise<LLMResponse> {
    const cache = options?.cacheEnabled ?? false;

    // Cache tools: mark the last tool with cache_control so the entire tools array is cached
    let toolsPayload: unknown[] | undefined;
    if (tools.length > 0) {
      toolsPayload = cache
        ? tools.map((t, i) => i === tools.length - 1
            ? { ...t, cache_control: { type: 'ephemeral' } }
            : t)
        : tools;
    }

    const body: Record<string, unknown> = {
      model: this.modelName,
      max_tokens: options?.maxTokens ?? 4096,
      messages,
      tools: toolsPayload,
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options?.topK !== undefined ? { top_k: options.topK } : {}),
      ...(this.apiKey ? { __apiKey: this.apiKey } : {}),
    };

    if (options?.system) {
      body.system = cache
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
