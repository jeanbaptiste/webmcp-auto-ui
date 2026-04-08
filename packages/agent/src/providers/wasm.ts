/**
 * WasmProvider — wraps the Gemma 4 Web Worker
 * Exposes the same LLMProvider interface as RemoteLLMProvider
 */
import type { LLMProvider, LLMResponse, ChatMessage, AnthropicTool, WasmModelId, ContentBlock } from '../types.js';

export type WasmStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WasmProviderOptions {
  model?: WasmModelId;
  workerUrl?: string;        // URL to the bundled gemma.worker.js
  workerFactory?: () => Worker;  // alternative: pass a factory fn
  onProgress?: (progress: number, status: string, loaded?: number, total?: number) => void;
  onStatusChange?: (status: WasmStatus) => void;
}

export class WasmProvider implements LLMProvider {
  readonly name = 'wasm';
  readonly model: string;

  private worker: Worker | null = null;
  private status: WasmStatus = 'idle';
  private pendingResolvers = new Map<string, { resolve: (v: string) => void; reject: (e: Error) => void }>();
  private opts: WasmProviderOptions;
  private initPromise: Promise<void> | null = null;

  constructor(options: WasmProviderOptions) {
    this.opts = options;
    this.model = options.model ?? 'gemma-e2b';
  }

  private setStatus(s: WasmStatus) {
    this.status = s;
    this.opts.onStatusChange?.(s);
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init().catch((err) => {
      // Allow retry on failure by clearing the cached promise
      this.initPromise = null;
      throw err;
    });
    return this.initPromise;
  }

  private _init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setStatus('loading');
      this.worker = this.opts.workerFactory
        ? this.opts.workerFactory()
        : new Worker(this.opts.workerUrl!, { type: 'module' });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, id, token, text, message, progress, status, loaded, total } = e.data as {
          type: string; id?: string; token?: string; text?: string;
          message?: string; progress?: number; status?: string;
          loaded?: number; total?: number;
        };

        if (type === 'progress') {
          this.opts.onProgress?.(progress ?? 0, status ?? '', loaded, total);
          return;
        }
        if (type === 'ready') { this.setStatus('ready'); resolve(); return; }
        if (type === 'error' && !id) { this.setStatus('error'); reject(new Error(message)); return; }
        if (type === 'token' && id) {
          // streaming tokens — handled in chat() via pendingResolvers on 'done'
          void token;
          return;
        }
        if ((type === 'done' || type === 'error') && id) {
          const r = this.pendingResolvers.get(id);
          if (!r) return;
          this.pendingResolvers.delete(id);
          if (type === 'error') r.reject(new Error(message));
          else r.resolve(text ?? '');
        }
      };

      this.worker.onerror = (e) => {
        this.setStatus('error');
        reject(new Error(e.message));
      };

      this.worker.postMessage({ type: 'init', model: this.model });
    });
  }

  async chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: { signal?: AbortSignal }
  ): Promise<LLMResponse> {
    if (this.status !== 'ready') await this.initialize();
    if (!this.worker) throw new Error('Worker not available');

    // Build Gemma chat prompt (ChatML format with tool hints)
    const systemParts: string[] = [];
    if (tools.length > 0) {
      systemParts.push('You have access to these tools (respond with JSON { "tool": "name", "args": {...} } to call one):');
      systemParts.push(tools.map(t => `- ${t.name}: ${t.description}`).join('\n'));
    }

    const parts: string[] = [];
    if (systemParts.length > 0) {
      parts.push(`<start_of_turn>system\n${systemParts.join('\n')}<end_of_turn>`);
    }
    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const text = typeof msg.content === 'string'
        ? msg.content
        : (msg.content as ContentBlock[]).filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('\n');
      parts.push(`<start_of_turn>${role}\n${text}<end_of_turn>`);
    }
    parts.push('<start_of_turn>model\n');
    const prompt = parts.join('\n');

    const id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const raw = await new Promise<string>((resolve, reject) => {
      this.pendingResolvers.set(id, { resolve, reject });
      options?.signal?.addEventListener('abort', () => {
        this.worker?.postMessage({ type: 'abort', id });
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
      this.worker!.postMessage({ type: 'chat', id, prompt });
    });

    // Try to parse as tool call JSON
    const content: ContentBlock[] = [];
    try {
      const parsed = JSON.parse(raw) as { tool?: string; args?: Record<string, unknown> };
      if (parsed.tool && parsed.args) {
        content.push({
          type: 'tool_use',
          id: `tc-${Date.now()}`,
          name: parsed.tool,
          input: parsed.args,
        });
      } else {
        content.push({ type: 'text', text: raw });
      }
    } catch {
      content.push({ type: 'text', text: raw });
    }

    return {
      content,
      stopReason: content.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
    };
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
    this.setStatus('idle');
    this.initPromise = null;
  }
}
