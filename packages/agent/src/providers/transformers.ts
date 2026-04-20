/**
 * TransformersProvider — runs transformers.js v4 (ONNX + WebGPU) in a Web Worker.
 *
 * Mirrors the public surface of WasmProvider (MediaPipe) so the agent loop can
 * swap providers freely. The heavy lifting (model load, generation, streaming,
 * KV cache, vision preprocessing) happens inside ./transformers.worker.ts — the
 * main thread only orchestrates postMessage traffic and exposes the standard
 * LLMProvider contract.
 */
import type {
  LLMProvider,
  LLMResponse,
  ChatMessage,
  ProviderTool,
  TransformersModelId,
  ContentBlock,
} from '../types.js';
import {
  TRANSFORMERS_MODELS,
  type TransformersModelEntry,
  type TransformersFamily,
} from './transformers-models.js';
import { buildGemmaPrompt } from '../prompts/gemma4-prompt-builder.js';
// The qwen / mistral prompt builders are resolved lazily inside buildPrompt so
// that the bundle only drags the one that matches the active promptKind.

export type TransformersStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TransformersProviderOptions {
  model?: TransformersModelId;
  contextSize?: number;
  onProgress?: (progress: number, status: string, loaded?: number, total?: number) => void;
  onStatusChange?: (status: TransformersStatus) => void;
}

type PromptKind = 'gemma' | 'qwen' | 'mistral';

function promptKindForFamily(family: TransformersFamily): PromptKind {
  switch (family) {
    case 'gemma4': return 'gemma';
    case 'qwen3': return 'qwen';
    case 'mistral': return 'mistral';
  }
}

interface PendingRequest {
  resolve: (value: LLMResponse) => void;
  reject: (err: Error) => void;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
  abortHandler?: () => void;
}

export class TransformersProvider implements LLMProvider {
  readonly name = 'transformers';
  readonly model: TransformersModelId;
  readonly promptKind: PromptKind;

  private entry: TransformersModelEntry;
  private worker: Worker | null = null;
  private status: TransformersStatus = 'idle';
  private opts: TransformersProviderOptions;
  private initPromise: Promise<void> | null = null;
  private pending = new Map<string, PendingRequest>();
  private requestCounter = 0;

  constructor(options: TransformersProviderOptions) {
    this.opts = options;
    const modelId = (options.model ?? 'transformers-gemma-4-e2b') as TransformersModelId;
    this.model = modelId;
    const entry = TRANSFORMERS_MODELS[modelId as keyof typeof TRANSFORMERS_MODELS];
    if (!entry) {
      throw new Error(`[transformers] unknown model id: ${modelId}`);
    }
    this.entry = entry;
    this.promptKind = promptKindForFamily(entry.family);
  }

  private setStatus(s: TransformersStatus) {
    this.status = s;
    this.opts.onStatusChange?.(s);
  }

  private nextRequestId(): string {
    this.requestCounter += 1;
    return `req-${Date.now()}-${this.requestCounter}`;
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./transformers.worker.ts', import.meta.url), {
      type: 'module',
    });
    w.addEventListener('message', (ev: MessageEvent) => this.handleMessage(ev.data));
    w.addEventListener('error', (ev) => {
      const msg = (ev as ErrorEvent).message || 'worker error';
      this.setStatus('error');
      for (const [, p] of this.pending) p.reject(new Error(msg));
      this.pending.clear();
    });
    this.worker = w;
    return w;
  }

  private handleMessage(msg: any): void {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.type) {
      case 'progress': {
        this.opts.onProgress?.(
          typeof msg.totalProgress === 'number' ? msg.totalProgress : 0,
          String(msg.status ?? 'downloading'),
          typeof msg.loaded === 'number' ? msg.loaded : undefined,
          typeof msg.total === 'number' ? msg.total : undefined,
        );
        return;
      }
      case 'ready': {
        this.setStatus('ready');
        const resolver = this.pending.get('__init__');
        if (resolver) {
          this.pending.delete('__init__');
          // The init "request" is resolved via a synthetic LLMResponse-less resolver.
          (resolver.resolve as unknown as (v: undefined) => void)(undefined);
        }
        return;
      }
      case 'error': {
        const err = new Error(String(msg.message ?? 'worker error'));
        const requestId: string | undefined = msg.requestId;
        if (requestId && this.pending.has(requestId)) {
          const p = this.pending.get(requestId)!;
          this.pending.delete(requestId);
          if (p.signal && p.abortHandler) p.signal.removeEventListener('abort', p.abortHandler);
          p.reject(err);
        } else {
          const init = this.pending.get('__init__');
          if (init) {
            this.pending.delete('__init__');
            init.reject(err);
          }
          this.setStatus('error');
        }
        return;
      }
      case 'warning': {
        // Worker surfaced a non-fatal warning (e.g. WebGPU fallback to WASM).
        this.opts.onProgress?.(
          typeof msg.totalProgress === 'number' ? msg.totalProgress : 1,
          `warning: ${String(msg.message ?? '')}`,
        );
        return;
      }
      case 'token': {
        const p = this.pending.get(String(msg.requestId));
        if (p?.onToken) p.onToken(String(msg.token ?? ''));
        return;
      }
      case 'done': {
        const requestId = String(msg.requestId);
        const p = this.pending.get(requestId);
        if (!p) return;
        this.pending.delete(requestId);
        if (p.signal && p.abortHandler) p.signal.removeEventListener('abort', p.abortHandler);
        const content: ContentBlock[] = Array.isArray(msg.content)
          ? (msg.content as ContentBlock[])
          : [{ type: 'text', text: String(msg.content ?? '') }];
        const hasToolUse = content.some(b => b.type === 'tool_use');
        p.resolve({
          content,
          stopReason: hasToolUse ? 'tool_use' : 'end_turn',
          stats: msg.stats ?? { tokensPerSec: 0, totalTokens: 0, latencyMs: 0 },
          usage: msg.usage ?? { input_tokens: 0, output_tokens: 0 },
        });
        return;
      }
      default:
        // Unknown message type — ignore to stay forward-compatible.
        return;
    }
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init().catch((err) => {
      this.initPromise = null;
      throw err;
    });
    return this.initPromise;
  }

  private _init(): Promise<void> {
    this.setStatus('loading');
    const worker = this.ensureWorker();

    return new Promise<void>((resolve, reject) => {
      // Register a synthetic pending entry keyed by '__init__' that handleMessage
      // resolves on 'ready' / rejects on 'error'.
      this.pending.set('__init__', {
        resolve: resolve as unknown as (v: LLMResponse) => void,
        reject,
      });
      worker.postMessage({
        type: 'load',
        modelId: this.model,
        entry: this.entry,
        contextSize: this.opts.contextSize ?? this.entry.contextLength,
      });
    });
  }

  /** Extract a base64 data-URL image from the last user message, if any.
   *  Vision turns are always one-shot: only the latest user turn's image is used. */
  private extractImageFromLastUserMessage(messages: ChatMessage[]): Uint8Array | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== 'user') continue;
      if (typeof m.content === 'string') return undefined;
      const imgBlock = m.content.find(
        (b): b is Extract<ContentBlock, { type: 'image' }> => b.type === 'image',
      );
      if (!imgBlock) return undefined;
      const match = imgBlock.data.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) return undefined;
      const bin = atob(match[1]);
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      return bytes;
    }
    return undefined;
  }

  private buildPrompt(messages: ChatMessage[], systemPrompt: string | undefined): string {
    switch (this.promptKind) {
      case 'gemma':
        return buildGemmaPrompt({ systemPrompt, messages });
      case 'qwen': {
        // Lazy require — the builder may not exist yet at build time.
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require('../prompts/qwen-prompt-builder.js');
          const build = mod.buildQwenPrompt ?? mod.default;
          return build({ systemPrompt, messages });
        } catch {
          // Fallback: bare concatenation so the worker still sees the system
          // prompt text; ChatML tagging happens worker-side.
          return [systemPrompt, ...messages.map(m => typeof m.content === 'string' ? m.content : '')]
            .filter(Boolean).join('\n\n');
        }
      }
      case 'mistral': {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require('../prompts/mistral-prompt-builder.js');
          const build = mod.buildMistralPrompt ?? mod.default;
          return build({ systemPrompt, messages });
        } catch {
          return [systemPrompt, ...messages.map(m => typeof m.content === 'string' ? m.content : '')]
            .filter(Boolean).join('\n\n');
        }
      }
    }
  }

  async chat(
    messages: ChatMessage[],
    _tools: ProviderTool[],
    options?: {
      signal?: AbortSignal;
      cacheEnabled?: boolean;
      system?: string;
      maxTokens?: number;
      temperature?: number;
      topK?: number;
      onToken?: (token: string) => void;
    },
  ): Promise<LLMResponse> {
    if (this.status !== 'ready') await this.initialize();
    const worker = this.ensureWorker();

    const prompt = this.buildPrompt(messages, options?.system);
    const image = this.entry.vision ? this.extractImageFromLastUserMessage(messages) : undefined;
    const requestId = this.nextRequestId();

    return new Promise<LLMResponse>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve,
        reject,
        onToken: options?.onToken,
        signal: options?.signal,
      };

      if (options?.signal) {
        const handler = () => {
          worker.postMessage({ type: 'abort', requestId });
        };
        pending.abortHandler = handler;
        options.signal.addEventListener('abort', handler);
      }

      this.pending.set(requestId, pending);

      const message: Record<string, unknown> = {
        type: 'generate',
        requestId,
        prompt,
        options: {
          maxTokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature,
          topK: options?.topK,
        },
      };
      if (image) message.image = image;
      worker.postMessage(message);
    });
  }

  destroy(): void {
    if (this.worker) {
      try { this.worker.postMessage({ type: 'dispose' }); } catch {}
      try { this.worker.terminate(); } catch {}
      this.worker = null;
    }
    for (const [, p] of this.pending) {
      p.reject(new Error('provider destroyed'));
    }
    this.pending.clear();
    this.setStatus('idle');
    this.initPromise = null;
  }
}
