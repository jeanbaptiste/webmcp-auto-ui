/**
 * WasmProvider — runs MediaPipe LlmInference directly on the main thread
 * No Web Worker needed — @mediapipe/tasks-genai is not compatible with ES module workers.
 * Uses dynamic import() to avoid bundling MediaPipe when only Claude is used.
 */
import type { LLMProvider, LLMResponse, ChatMessage, AnthropicTool, WasmModelId, ContentBlock } from '../types.js';

export type WasmStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WasmProviderOptions {
  model?: WasmModelId;
  onProgress?: (progress: number, status: string, loaded?: number, total?: number) => void;
  onStatusChange?: (status: WasmStatus) => void;
}

const LITERT_MODELS: Record<string, { repo: string; file: string }> = {
  'gemma-e2b': { repo: 'litert-community/gemma-4-E2B-it-litert-lm', file: 'gemma-4-E2B-it-web.task' },
  'gemma-e4b': { repo: 'litert-community/gemma-4-E4B-it-litert-lm', file: 'gemma-4-E4B-it-web.task' },
};

export class WasmProvider implements LLMProvider {
  readonly name = 'wasm';
  readonly model: string;

  private inference: any = null;  // LlmInference
  private status: WasmStatus = 'idle';
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

  private async _init(): Promise<void> {
    this.setStatus('loading');

    // Dynamic import to avoid bundling MediaPipe when not used
    const { FilesetResolver, LlmInference } = await import('@mediapipe/tasks-genai');

    const { repo, file } = LITERT_MODELS[this.model] ?? LITERT_MODELS['gemma-e2b'];
    const url = `https://huggingface.co/${repo}/resolve/main/${file}`;

    this.opts.onProgress?.(0, 'downloading', 0, 0);

    const modelStream = await this.getModelStream(url, file);

    this.opts.onProgress?.(1, 'initializing', 0, 0);

    // Resolve the GenAI WASM fileset from CDN (pinned version)
    const genaiFileset = await FilesetResolver.forGenAiTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm',
    );

    // WebGPU device (optional — falls back to CPU if unavailable)
    let gpuDevice: any;
    try {
      gpuDevice = await LlmInference.createWebGpuDevice();
    } catch {
      // WebGPU not available — will use CPU
    }

    // Pass stream reader as modelAssetBuffer — same pattern as the official
    // MediaPipe sample (avoids buffering the entire model in RAM).
    this.inference = await LlmInference.createFromOptions(genaiFileset, {
      baseOptions: {
        modelAssetBuffer: modelStream.getReader() as unknown as Uint8Array,
        ...(gpuDevice ? { delegate: 'GPU' } : {}),
      },
      ...(gpuDevice ? { gpuOptions: { device: gpuDevice } } : {}),
      maxTokens: 8192,
      temperature: 0.7,
      topK: 40,
    });

    this.setStatus('ready');
  }

  /**
   * Download model with OPFS caching, returning a ReadableStream.
   * The stream reader is passed directly to LlmInference as modelAssetBuffer
   * to avoid buffering multi-GB models entirely in RAM.
   */
  private async getModelStream(
    url: string,
    filename: string,
  ): Promise<ReadableStream<Uint8Array>> {
    const progressCb = (p: number, loaded: number, total: number) => {
      this.opts.onProgress?.(p, 'downloading', loaded, total);
    };

    const root = await navigator.storage.getDirectory();
    const modelsDir = await root.getDirectoryHandle('webmcp-models', { create: true });

    // ── OPFS cache hit ───────────────────────────────────────────────
    try {
      const cached = await modelsDir.getFileHandle(filename);
      const file = await cached.getFile();
      // Verify the file is complete (size file stores expected size)
      try {
        const sizeHandle = await modelsDir.getFileHandle(filename + '_size');
        const sizeFile = await sizeHandle.getFile();
        const expectedSize = parseInt(await sizeFile.text());
        if (file.size !== expectedSize) {
          // Corrupt cache — remove and re-download
          await modelsDir.removeEntry(filename);
          await modelsDir.removeEntry(filename + '_size');
          throw new Error('cache size mismatch');
        }
      } catch {
        // No size file but model exists — use it (legacy cache)
      }
      progressCb(1, file.size, file.size);
      return file.stream() as ReadableStream<Uint8Array>;
    } catch {
      // Cache miss — download from network
    }

    // ── Network download ─────────────────────────────────────────────
    // HEAD request first to get content-length for progress
    let expectedSize = 0;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head.ok) expectedSize = parseInt(head.headers.get('content-length') ?? '0', 10);
    } catch { /* non-fatal */ }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    if (!response.body) throw new Error('Response body is null');

    const total = expectedSize || parseInt(response.headers.get('content-length') ?? '0', 10);

    // Tee: one stream for consumer, one for background OPFS caching
    const [streamForConsumer, streamForCache] = response.body.tee();

    // Background cache (non-blocking, fire-and-forget)
    (async () => {
      try {
        // Write expected size first
        const sizeHandle = await modelsDir.getFileHandle(filename + '_size', { create: true });
        const sizeWritable = await sizeHandle.createWritable();
        await sizeWritable.write(new TextEncoder().encode(String(total)));
        await sizeWritable.close();

        const handle = await modelsDir.getFileHandle(filename, { create: true });
        const writable = await handle.createWritable();
        await streamForCache.pipeTo(writable);
      } catch {
        // OPFS write failure is non-fatal — model still usable from stream
        try {
          await modelsDir.removeEntry(filename).catch(() => {});
          await modelsDir.removeEntry(filename + '_size').catch(() => {});
        } catch { /* ignore cleanup errors */ }
      }
    })();

    // Wrap with progress reporting
    let loaded = 0;
    const progressTransform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.length;
        progressCb(total > 0 ? loaded / total : 0, loaded, total);
        controller.enqueue(chunk);
      },
    });

    return streamForConsumer.pipeThrough(progressTransform);
  }

  async chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: { signal?: AbortSignal; maxTokens?: number; temperature?: number; topK?: number }
  ): Promise<LLMResponse> {
    if (this.status !== 'ready') await this.initialize();
    if (!this.inference) throw new Error('Model not initialized');

    // Apply per-request options
    if (options?.maxTokens || options?.temperature || options?.topK) {
      try {
        await this.inference.setOptions({
          ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.topK !== undefined ? { topK: options.topK } : {}),
        });
      } catch {
        // setOptions failure is non-fatal — use defaults
      }
    }

    // Build Gemma chat prompt (ChatML format with tool hints)
    const prompt = this.buildPrompt(messages, tools);

    // Generate
    const t0 = performance.now();
    let fullText = '';
    let tokenCount = 0;

    try {
      const result = await this.inference.generateResponse(prompt, (partialResult: string, _done: boolean) => {
        if (options?.signal?.aborted) {
          this.inference?.cancelProcessing();
          return;
        }
        fullText += partialResult;
        tokenCount++;
      });

      // Fallback if the streaming callback didn't accumulate
      if (result && !fullText) fullText = result;
    } catch (err) {
      const msg = String(err);
      if (options?.signal?.aborted || msg.includes('cancel')) {
        // Cancelled — return what we have so far
      } else {
        throw err;
      }
    }

    const latencyMs = performance.now() - t0;

    // Parse tool calls
    const content: ContentBlock[] = [];
    try {
      const parsed = JSON.parse(fullText) as { tool?: string; args?: Record<string, unknown> };
      if (parsed.tool && parsed.args) {
        content.push({
          type: 'tool_use',
          id: `tc-${Date.now()}`,
          name: parsed.tool,
          input: parsed.args,
        });
      } else {
        content.push({ type: 'text', text: fullText });
      }
    } catch {
      content.push({ type: 'text', text: fullText });
    }

    return {
      content,
      stopReason: content.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
      stats: {
        tokensPerSec: tokenCount > 0 ? tokenCount / (latencyMs / 1000) : 0,
        totalTokens: tokenCount,
        latencyMs,
      },
    };
  }

  private buildPrompt(messages: ChatMessage[], tools: AnthropicTool[]): string {
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
    return parts.join('\n');
  }

  destroy() {
    this.inference?.close?.();
    this.inference = null;
    this.setStatus('idle');
    this.initPromise = null;
  }
}
