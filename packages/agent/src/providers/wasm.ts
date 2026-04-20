/**
 * WasmProvider — runs MediaPipe LlmInference directly on the main thread
 * No Web Worker needed — @mediapipe/tasks-genai is not compatible with ES module workers.
 * Uses dynamic import() to avoid bundling MediaPipe when only Claude is used.
 */
import type { LLMProvider, LLMResponse, ChatMessage, ProviderTool, WasmModelId, ContentBlock } from '../types.js';
import type { PipelineTrace } from '../pipeline-trace.js';
import {
  buildGemmaPrompt,
  formatGemmaToolDeclaration,
  formatToolCall,
  formatToolResponse,
  gemmaValue,
} from '../prompts/gemma4-prompt-builder.js';

export type WasmStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WasmProviderOptions {
  model?: WasmModelId;
  contextSize?: number;  // MediaPipe maxTokens — default 32768
  onProgress?: (progress: number, status: string, loaded?: number, total?: number) => void;
  onStatusChange?: (status: WasmStatus) => void;
}

const LITERT_MODELS: Record<string, { repo: string; file: string; size: number }> = {
  'gemma-e2b': { repo: 'litert-community/gemma-4-E2B-it-litert-lm', file: 'gemma-4-E2B-it-web.task', size: 2_003_697_664 },
  'gemma-e4b': { repo: 'litert-community/gemma-4-E4B-it-litert-lm', file: 'gemma-4-E4B-it-web.task', size: 2_964_324_352 },
};

export class WasmProvider implements LLMProvider {
  readonly name = 'wasm';
  readonly model: string;
  /** Signals to the agent loop that the system prompt must be built in Gemma native syntax. */
  readonly promptKind = 'gemma' as const;

  /** Optional pipeline trace — set externally to trace parsing strategy fallbacks */
  trace?: PipelineTrace;

  private inference: any = null;  // LlmInference
  private status: WasmStatus = 'idle';
  private opts: WasmProviderOptions;
  private initPromise: Promise<void> | null = null;
  private busy = false;

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
      maxTokens: this.opts.contextSize ?? 32768,
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

    // ── Clean orphan .crswap files (Chrome WritableStream leftovers) ──
    try { await modelsDir.removeEntry(`${filename}.crswap`); } catch { /* no swap — OK */ }

    // ── OPFS cache hit ───────────────────────────────────────────────
    try {
      const cached = await modelsDir.getFileHandle(filename);
      const file = await cached.getFile();
      if (file.size > 1000 && (total === 0 || Math.abs(file.size - total) < total * 0.01)) {
        progressCb(1, file.size, file.size);
        this.opts.onProgress?.(1, 'cached', file.size, file.size);
        return file.stream() as ReadableStream<Uint8Array>;
      }
      // Corrupt cache (0 bytes or wrong size) — remove and re-download
      await modelsDir.removeEntry(filename).catch(() => {});
      try { await modelsDir.removeEntry(`${filename}.crswap`); } catch { /* OK */ }
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
    tools: ProviderTool[],
    options?: { signal?: AbortSignal; maxTokens?: number; temperature?: number; topK?: number; onToken?: (token: string) => void; system?: string }
  ): Promise<LLMResponse> {
    if (this.status !== 'ready') await this.initialize();
    if (!this.inference) throw new Error('Model not initialized');
    // Wait for previous MediaPipe generation to fully release GPU resources
    if (this.busy) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 200));
        if (!this.busy) break;
      }
      if (this.busy) throw new Error('Model is busy — wait for current generation to finish');
    }

    this.busy = true;
    try {
      return await this._chat(messages, tools, options);
    } finally {
      // Small delay to let MediaPipe release internal resources before next call
      await new Promise(r => setTimeout(r, 100));
      this.busy = false;
    }
  }

  private async _chat(
    messages: ChatMessage[],
    tools: ProviderTool[],
    options?: { signal?: AbortSignal; maxTokens?: number; temperature?: number; topK?: number; onToken?: (token: string) => void; system?: string }
  ): Promise<LLMResponse> {
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

    // Aggressive clipping: Gemma struggles with long conversations — dynamic cap based on context size
    const contextTokens = this.opts.contextSize ?? 32768;
    const MAX_MESSAGES = Math.max(4, Math.floor(contextTokens / 512));
    while (messages.length > MAX_MESSAGES) {
      messages = messages.slice(1);
    }
    prompt = this.buildPrompt(messages, tools, options?.system);

    // Token-based clipping: if prompt is still too large, drop oldest messages
    const maxPromptTokens = (this.opts.contextSize ?? 32768) - 512;
    try {
      while (this.inference.sizeInTokens(prompt) > maxPromptTokens && messages.length > 1) {
        messages = messages.slice(1);
        prompt = this.buildPrompt(messages, tools, options?.system);
      }
    } catch {
      // sizeInTokens not available — skip clipping
    }

    // Count input tokens for usage reporting (TokenBubble Ctx ratio)
    let inputTokenCount = 0;
    try {
      inputTokenCount = this.inference.sizeInTokens(prompt);
    } catch {
      // sizeInTokens not available — estimate from char count
      inputTokenCount = Math.round(prompt.length / 4);
    }

    // Generate
    const t0 = performance.now();
    let fullText = '';
    let tokenCount = 0;

    // Retry loop — MediaPipe may throw "Previous invocation or loading is still ongoing"
    // even after our busy guard clears, because GPU resources release asynchronously.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const MAX_REPEATS = 20;
        const TOOL_CALL_MAX_CHARS = 3000;

        // ── Chrome M4 memory leak workaround (MediaPipe #6270) ─────────────
        // Rather than accumulating chunks directly in a closure over the
        // ProgressListener callback — which pins references and leaks on
        // Chrome/Mac M4 — we bridge the callback into a ReadableStream and
        // consume it via a ReadableStreamDefaultReader. Each chunk is fully
        // processed and released before the next `await reader.read()`, which
        // lets the GC reclaim intermediate strings between chunks.
        const inference = this.inference;
        const signal = options?.signal;
        const streamControllerRef: { current: ReadableStreamDefaultController<string> | null } = { current: null };
        const tokenStream = new ReadableStream<string>({
          start(controller: ReadableStreamDefaultController<string>) {
            streamControllerRef.current = controller;
          },
        });

        const generationPromise = inference.generateResponse(prompt, (partialResult: string, done: boolean) => {
          if (signal?.aborted) {
            inference?.cancelProcessing();
            try { streamControllerRef.current?.close(); } catch {}
            return;
          }
          try { streamControllerRef.current?.enqueue(partialResult); } catch {}
          if (done) {
            try { streamControllerRef.current?.close(); } catch {}
          }
        });

        const reader: ReadableStreamDefaultReader<string> = tokenStream.getReader();
        let lastToken = '';
        let repeatCount = 0;
        let cancelledEarly = false;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const partialResult = value ?? '';

            // Detect infinite repetition loop (e.g. Gemma repeating 't' 150 times)
            if (partialResult === lastToken) {
              repeatCount++;
              if (repeatCount > MAX_REPEATS) {
                this.inference?.cancelProcessing();
                cancelledEarly = true;
                break;
              }
            } else {
              lastToken = partialResult;
              repeatCount = 0;
            }
            fullText += partialResult;
            tokenCount++;
            options?.onToken?.(partialResult);

            // Early detect and strip fake tool_response in streaming
            if (fullText.includes('<|tool_response>') && fullText.includes('<tool_call|>')) {
              const lastCallEnd = fullText.lastIndexOf('<tool_call|>');
              const responseStart = fullText.indexOf('<|tool_response>', lastCallEnd);
              if (responseStart !== -1) {
                // Gemma is hallucinating a response — cancel immediately
                this.inference?.cancelProcessing();
                // Truncate to last valid tool call
                fullText = fullText.slice(0, lastCallEnd + '<tool_call|>'.length);
                cancelledEarly = true;
                break;
              }
            }

            // Safety: if text grows way too long, force cancel
            if (fullText.length > TOOL_CALL_MAX_CHARS * 2) {
              this.inference?.cancelProcessing();
              cancelledEarly = true;
              break;
            }
          }
        } finally {
          try { reader.releaseLock(); } catch {}
          if (cancelledEarly) {
            try { streamControllerRef.current?.close(); } catch {}
          }
        }

        const result = await generationPromise.catch(() => '');
        // Fallback if the streaming callback didn't accumulate
        if (result && !fullText) fullText = result;

        // Pipeline-trace event: why did generation stop?
        // - cancelled: we aborted mid-stream (repetition loop, fake tool_response, oversized, abort signal)
        // - maxTokens: hit the maxTokens ceiling passed via options
        // - eos: natural end-of-stream from MediaPipe (model emitted EOS)
        const endReason = cancelledEarly
          ? 'cancelled'
          : tokenCount >= (options?.maxTokens ?? 4096)
            ? 'maxTokens'
            : 'eos';
        const tail = fullText.slice(-80).replace(/\n/g, '\\n');
        console.log(`[wasm] end=${endReason} tokens=${tokenCount}/${options?.maxTokens ?? '?'} tail="${tail}"`);
        this.trace?.push('generate', 'wasm', `end=${endReason} tokens=${tokenCount}/${options?.maxTokens ?? '?'} tail="${tail}"`, endReason === 'eos' ? 'ok' : 'warn');

        break; // Success — exit retry loop
      } catch (err) {
        const msg = String(err);
        if (options?.signal?.aborted || msg.includes('cancel')) {
          // Cancelled — return what we have so far
          break;
        }
        if (msg.includes('Previous invocation') || msg.includes('still ongoing')) {
          // MediaPipe GPU not ready — wait and retry
          fullText = '';
          tokenCount = 0;
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    // Strip hallucinated framework tokens the model should never emit on its own:
    // - <|tool_response>...<tool_response|>  (injected by the framework, never generated)
    // - <|channel>thought...<channel|>      (ghost thought channels if Gemma emits one
    //   without <|think|> activation — stray artefacts from pretraining)
    // - <|think|>                            (stray thinking-mode markers)
    fullText = fullText
      .replace(/<\|tool_response>[\s\S]*?<tool_response\|>/g, '')
      .replace(/<\|channel>thought[\s\S]*?<channel\|>/g, '')
      .replace(/<\|think\|>/g, '');

    const latencyMs = performance.now() - t0;

    // Use sizeInTokens for accurate token count if available
    let realTokenCount = tokenCount;
    try {
      if (this.inference?.sizeInTokens) {
        realTokenCount = this.inference.sizeInTokens(fullText) ?? tokenCount;
      }
    } catch {}

    const content: ContentBlock[] = [];
    const START_TAG = '<|tool_call>call:';
    const END_TAG = '<tool_call|>';
    let foundToolCall = false;
    let scanIdx = 0;
    while (true) {
      const startIdx = fullText.indexOf(START_TAG, scanIdx);
      if (startIdx === -1) break;
      const nameStart = startIdx + START_TAG.length;
      const braceIdx = fullText.indexOf('{', nameStart);
      if (braceIdx === -1) break;
      const name = fullText.slice(nameStart, braceIdx);
      if (!/^\w+$/.test(name)) { scanIdx = nameStart; continue; }
      const argsBlock = WasmProvider.extractArgsBlock(fullText, braceIdx);
      if (!argsBlock) break;
      const afterArgs = braceIdx + argsBlock.length;
      if (!fullText.startsWith(END_TAG, afterArgs)) { scanIdx = afterArgs; continue; }
      foundToolCall = true;
      content.push({
        type: 'tool_use',
        id: `tc-${Date.now()}-${content.length}`,
        name,
        input: WasmProvider.parseGemmaArgs(argsBlock),
      });
      scanIdx = afterArgs + END_TAG.length;
    }

    if (!foundToolCall) {
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
      usage: {
        input_tokens: inputTokenCount,
        output_tokens: realTokenCount,
      },
    };
  }

  /**
   * Extract a brace-balanced {...} block starting at text[startIdx].
   * Ignores { and } that appear inside <|"|>...<|"|> string delimiters.
   * Returns the full block including outer braces, or null if unbalanced.
   */
  private static extractArgsBlock(text: string, startIdx: number): string | null {
    if (text[startIdx] !== '{') return null;
    const DELIM = '<|"|>';
    let depth = 0;
    let i = startIdx;
    while (i < text.length) {
      if (text.startsWith(DELIM, i)) {
        i += DELIM.length;
        const end = text.indexOf(DELIM, i);
        if (end === -1) return null;
        i = end + DELIM.length;
        continue;
      }
      if (text[i] === '"') {
        i++;
        while (i < text.length && text[i] !== '"') {
          if (text[i] === '\\' && i + 1 < text.length) { i += 2; continue; }
          i++;
        }
        i++;
        continue;
      }
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) return text.slice(startIdx, i + 1);
      }
      i++;
    }
    return null;
  }

  /**
   * Parse Gemma native tool call args by normalizing to strict JSON.
   * Handles both `<|"|>...<|"|>` (Gemma native) and `"..."` (JSON-style, emitted
   * when the model copies JS-syntax examples from recipe bodies). Raw newlines
   * inside JSON strings are escaped. Unquoted keys are quoted.
   */
  private static parseGemmaArgs(raw: string): Record<string, unknown> {
    const DELIM = '<|"|>';
    let out = '';
    let i = 0;
    while (i < raw.length) {
      if (raw.startsWith(DELIM, i)) {
        i += DELIM.length;
        const end = raw.indexOf(DELIM, i);
        if (end === -1) return {};
        out += JSON.stringify(raw.slice(i, end));
        i = end + DELIM.length;
        continue;
      }
      const c = raw[i];
      if (c === '"') {
        let content = '';
        i++;
        while (i < raw.length && raw[i] !== '"') {
          const ch = raw[i];
          if (ch === '\\' && i + 1 < raw.length) { content += ch + raw[i + 1]; i += 2; continue; }
          if (ch === '\n') content += '\\n';
          else if (ch === '\r') content += '\\r';
          else if (ch === '\t') content += '\\t';
          else content += ch;
          i++;
        }
        if (i >= raw.length) return {};
        out += '"' + content + '"';
        i++;
        continue;
      }
      if (c === '{' || c === ',') {
        out += c;
        i++;
        while (i < raw.length && /\s/.test(raw[i])) { out += raw[i++]; }
        const keyStart = i;
        while (i < raw.length && /[a-zA-Z0-9_$]/.test(raw[i])) i++;
        if (i > keyStart) {
          let j = i;
          while (j < raw.length && /\s/.test(raw[j])) j++;
          if (raw[j] === ':') out += '"' + raw.slice(keyStart, i) + '"';
          else out += raw.slice(keyStart, i);
        }
        continue;
      }
      out += c;
      i++;
    }
    try {
      const parsed = JSON.parse(out);
      return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {};
    } catch {
      return {};
    }
  }

  /** @internal — delegates to `gemmaValue` from prompts/gemma4-prompt-builder. */
  static gemmaValue(v: unknown): string {
    return gemmaValue(v);
  }

  /** @internal — delegates to `formatGemmaToolDeclaration` from prompts/gemma4-prompt-builder. */
  static formatToolDeclaration(tool: ProviderTool): string {
    return formatGemmaToolDeclaration(tool);
  }

  /** @internal — delegates to `formatToolResponse` from prompts/gemma4-prompt-builder. */
  static formatToolResponse(content: string): string {
    return formatToolResponse(content);
  }

  /** @internal — delegates to `formatToolCall` from prompts/gemma4-prompt-builder. */
  static formatToolCall(name: string, input: Record<string, unknown>): string {
    return formatToolCall(name, input);
  }

  private buildPrompt(messages: ChatMessage[], _tools: ProviderTool[], systemPrompt?: string): string {
    // `_tools` is intentionally ignored — tool declarations are embedded inline
    // inside `systemPrompt` via buildSystemPromptWithAliases({ providerKind: 'gemma' }).
    return buildGemmaPrompt({ systemPrompt, messages });
  }

  destroy() {
    this.inference?.close?.();
    this.inference = null;
    this.setStatus('idle');
    this.initPromise = null;
  }
}

// BuildGemmaPromptInput and buildGemmaPrompt now live in
// ../prompts/gemma4-prompt-builder.ts. Re-exported here for backward compat.
export { buildGemmaPrompt } from '../prompts/gemma4-prompt-builder.js';
export type { BuildGemmaPromptInput } from '../prompts/gemma4-prompt-builder.js';
