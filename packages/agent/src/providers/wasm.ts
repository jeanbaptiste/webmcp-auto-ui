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

const LITERT_MODELS: Record<string, { repo: string; file: string; size: number }> = {
  'gemma-e2b': { repo: 'litert-community/gemma-4-E2B-it-litert-lm', file: 'gemma-4-E2B-it-web.task', size: 1_500_000_000 },
  'gemma-e4b': { repo: 'litert-community/gemma-4-E4B-it-litert-lm', file: 'gemma-4-E4B-it-web.task', size: 2_964_324_352 },
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

    const modelInfo = LITERT_MODELS[this.model] ?? LITERT_MODELS['gemma-e2b'];
    const { repo, file, size: expectedSize } = modelInfo;
    const url = `https://huggingface.co/${repo}/resolve/main/${file}`;

    this.opts.onProgress?.(0, 'downloading', 0, expectedSize);

    // Launch fileset resolution in parallel with model download
    const filesetPromise = FilesetResolver.forGenAiTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm',
    );

    const modelStream = await this.getModelStream(url, file, expectedSize);

    this.opts.onProgress?.(1, 'initializing', 0, 0);

    const genaiFileset = await filesetPromise;

    // Pass stream reader as modelAssetBuffer — same pattern as the official
    // MediaPipe sample (avoids buffering the entire model in RAM).
    // GPU device is created automatically by createFromOptions if available.
    this.inference = await LlmInference.createFromOptions(genaiFileset, {
      baseOptions: {
        modelAssetBuffer: modelStream.getReader() as unknown as Uint8Array,
      },
      maxTokens: 4096,
      temperature: 1.0,
      topK: 64,
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
    knownSize: number,
  ): Promise<ReadableStream<Uint8Array>> {
    const total = knownSize;
    const progressCb = (p: number, loaded: number, t: number) => {
      this.opts.onProgress?.(p, 'downloading', loaded, t);
    };

    const root = await navigator.storage.getDirectory();
    const modelsDir = await root.getDirectoryHandle('webmcp-models', { create: true });

    // ── OPFS cache hit ───────────────────────────────────────────────
    try {
      const cached = await modelsDir.getFileHandle(filename);
      const file = await cached.getFile();
      if (file.size > 1000 && (total === 0 || Math.abs(file.size - total) < total * 0.01)) {
        progressCb(1, file.size, file.size);
        this.opts.onProgress?.(1, 'cached', file.size, file.size);
        return file.stream() as ReadableStream<Uint8Array>;
      }
      // Corrupt cache — remove and re-download
      await modelsDir.removeEntry(filename).catch(() => {});
    } catch {
      // Cache miss
    }

    // ── Network download (retry on 503) ───────────────────────────────
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url);
      if (response.ok) break;
      if (response.status === 503 && attempt < 2) {
        const wait = (attempt + 1) * 5000;
        this.opts.onProgress?.(0, `retry in ${wait / 1000}s (503)`, 0, total);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    if (!response!.ok) throw new Error('Download failed after retries');
    if (!response!.body) throw new Error('Response body is null');

    const [streamForConsumer, streamForCache] = response!.body!.tee();

    // Background OPFS cache (fire-and-forget)
    (async () => {
      try {
        const handle = await modelsDir.getFileHandle(filename, { create: true });
        const writable = await handle.createWritable();
        await streamForCache.pipeTo(writable);
      } catch {
        try { await modelsDir.removeEntry(filename).catch(() => {}); } catch {}
      }
    })();

    // Progress stream using known size
    let loaded = 0;
    const progressTransform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.length;
        progressCb(total > 0 ? loaded / total : 0, loaded, total);
        controller.enqueue(chunk);
      },
      flush() {
        progressCb(1, total, total);
      },
    });

    return streamForConsumer.pipeThrough(progressTransform);
  }

  async chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: { signal?: AbortSignal; maxTokens?: number; temperature?: number; topK?: number; onToken?: (token: string) => void; system?: string }
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

    // Build Gemma chat prompt (Gemma 4 format with tool hints)
    let prompt = this.buildPrompt(messages, tools, options?.system);

    // Clipping: if prompt is too large, drop oldest messages (reserve 384 tokens for response)
    const maxPromptTokens = 4096 - 512;
    try {
      while (this.inference.sizeInTokens(prompt) > maxPromptTokens && messages.length > 1) {
        messages = messages.slice(1);
        prompt = this.buildPrompt(messages, tools, options?.system);
      }
    } catch {
      // sizeInTokens not available — skip clipping
    }

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
        options?.onToken?.(partialResult);
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

    // Use sizeInTokens for accurate token count if available
    let realTokenCount = tokenCount;
    try {
      if (this.inference?.sizeInTokens) {
        realTokenCount = this.inference.sizeInTokens(fullText) ?? tokenCount;
      }
    } catch {}

    // Parse tool calls — supports multiple formats:
    // 1. Gemma 4 native: <|tool_call>call:tool_name{...args}<tool_call|>
    // 2. JSON format: { "tool": "name", "args": {...} }
    const content: ContentBlock[] = [];
    const gemmaToolCallRe = /<\|tool_call>call:(\w+)(\{[^]*?\})<tool_call\|>/g;
    let match: RegExpExecArray | null;
    let foundToolCall = false;

    while ((match = gemmaToolCallRe.exec(fullText)) !== null) {
      foundToolCall = true;
      const toolName = match[1];
      let toolArgs: Record<string, unknown> = {};
      try { toolArgs = JSON.parse(match[2]); } catch {}
      content.push({
        type: 'tool_use',
        id: `tc-${Date.now()}-${content.length}`,
        name: toolName,
        input: toolArgs,
      });
    }

    if (!foundToolCall) {
      // Try JSON format fallback — strip markdown code blocks first
      let cleaned = fullText.trim();
      const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (mdMatch) cleaned = mdMatch[1].trim();

      try {
        const parsed = JSON.parse(cleaned) as { tool?: string; args?: Record<string, unknown> };
        if (parsed.tool && parsed.args) {
          foundToolCall = true;
          content.push({
            type: 'tool_use',
            id: `tc-${Date.now()}`,
            name: parsed.tool,
            input: parsed.args,
          });
        }
      } catch {}
    }

    if (!foundToolCall) {
      // Extract text without tool call tags
      const cleanText = fullText.replace(/<\|tool_call>.*?<tool_call\|>/g, '').trim();
      content.push({ type: 'text', text: cleanText || fullText });
    }

    return {
      content,
      stopReason: content.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
      stats: {
        tokensPerSec: realTokenCount > 0 ? realTokenCount / (latencyMs / 1000) : 0,
        totalTokens: realTokenCount,
        latencyMs,
      },
    };
  }

  private buildPrompt(messages: ChatMessage[], tools: AnthropicTool[], systemPrompt?: string): string {
    const systemParts: string[] = [];

    // Inject system prompt from settings if provided
    if (systemPrompt) {
      systemParts.push(systemPrompt);
    }

    if (tools.length > 0) {
      systemParts.push(`You are a tool-calling assistant. RULES:
1. NEVER ask for confirmation. Execute tools immediately.
2. NEVER explain what you will do. Just call the tool.
3. Chain tool calls: use DATA tools first, then render_* tools to display results.
4. Respond with ONLY the JSON tool call, no markdown, no explanation.
5. Format: {"tool": "tool_name", "args": {...}}

Example:
User: show bird photos
You: {"tool": "search_observations", "args": {"query": "birds"}}

Available tools:`);
      systemParts.push(tools.map(t => `- ${t.name}: ${t.description}`).join('\n'));
    }

    const parts: string[] = [];
    if (systemParts.length > 0) {
      // Gemma 4 has no system role — inject system content as a user turn
      parts.push(`<|turn>user\n${systemParts.join('\n')}<turn|>`);
    }
    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const text = typeof msg.content === 'string'
        ? msg.content
        : (msg.content as ContentBlock[]).filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('\n');
      parts.push(`<|turn>${role}\n${text}<turn|>`);
    }
    parts.push('<|turn>model\n');
    return parts.join('\n');
  }

  destroy() {
    this.inference?.close?.();
    this.inference = null;
    this.setStatus('idle');
    this.initPromise = null;
  }
}
