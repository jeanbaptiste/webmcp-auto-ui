/**
 * WasmProvider — runs MediaPipe LlmInference directly on the main thread
 * No Web Worker needed — @mediapipe/tasks-genai is not compatible with ES module workers.
 * Uses dynamic import() to avoid bundling MediaPipe when only Claude is used.
 */
import type { LLMProvider, LLMResponse, ChatMessage, ProviderTool, WasmModelId, ContentBlock } from '../types.js';
import type { PipelineTrace } from '../pipeline-trace.js';
import { formatGemmaToolDeclaration, gemmaValue } from '../tool-layers.js';

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
        let lastToken = '';
        let repeatCount = 0;
        const MAX_REPEATS = 20;
        const TOOL_CALL_MAX_CHARS = 3000;

        const result = await this.inference.generateResponse(prompt, (partialResult: string, _done: boolean) => {
          if (options?.signal?.aborted) {
            this.inference?.cancelProcessing();
            return;
          }
          // Detect infinite repetition loop (e.g. Gemma repeating 't' 150 times)
          if (partialResult === lastToken) {
            repeatCount++;
            if (repeatCount > MAX_REPEATS) {
              this.inference?.cancelProcessing();
              return;
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
              return;
            }
          }

          // Safety: if text grows way too long, force cancel
          if (fullText.length > TOOL_CALL_MAX_CHARS * 2) {
            this.inference?.cancelProcessing();
            return;
          }
        });

        // Fallback if the streaming callback didn't accumulate
        if (result && !fullText) fullText = result;
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

    // Strip any standalone <|tool_response> blocks in model output
    // (the model should never generate these — they're injected by the framework)
    fullText = fullText.replace(/<\|tool_response>[\s\S]*?<tool_response\|>/g, '');

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
    let inString = false;
    let i = startIdx;
    while (i < text.length) {
      if (text.startsWith(DELIM, i)) {
        inString = !inString;
        i += DELIM.length;
        continue;
      }
      if (!inString) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
          depth--;
          if (depth === 0) return text.slice(startIdx, i + 1);
        }
      }
      i++;
    }
    return null;
  }

  /**
   * Parse Gemma native tool call args by normalizing to JSON in one pass.
   *   1. `<|"|>...<|"|>`      → `"..."`          (string delimiters)
   *   2. Unquoted keys         → `"quoted":`      (valid JSON keys)
   * Then `JSON.parse` handles nesting, arrays, numbers, booleans, null natively.
   * Example: {schema:<|"|>senat<|"|>,params:{data:[{id:1}]}} → {schema:"senat",params:{data:[{id:1}]}}
   */
  private static parseGemmaArgs(raw: string): Record<string, unknown> {
    const jsonStr = raw
      .replace(/<\|"\|>([\s\S]*?)<\|"\|>/g, (_, s) => JSON.stringify(s))
      .replace(/([{,])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    try {
      const parsed = JSON.parse(jsonStr);
      return (typeof parsed === 'object' && parsed !== null) ? parsed : {};
    } catch {
      return {};
    }
  }

  /**
   * Format a value for Gemma 4 native tool syntax.
   * Backward-compat wrapper — delegates to the module-level `gemmaValue`
   * exported from `tool-layers.ts` so the logic is shared with the
   * system-prompt declaration block.
   * @internal — used by formatToolCall / formatToolResponse
   */
  static gemmaValue(v: unknown): string {
    return gemmaValue(v);
  }

  /**
   * Format a tool declaration in Gemma 4 native syntax.
   * Backward-compat wrapper — delegates to `formatGemmaToolDeclaration`
   * exported from `tool-layers.ts`.
   * @internal
   */
  static formatToolDeclaration(tool: ProviderTool): string {
    return formatGemmaToolDeclaration(tool);
  }

  /**
   * Format a tool response in Gemma 4 native syntax.
   * @internal — used by buildGemmaPrompt
   */
  static formatToolResponse(toolName: string, content: string): string {
    const q = '<|"|>';
    // Try to parse as JSON for structured output
    try {
      const parsed = JSON.parse(content);
      return `<|tool_response>response:${toolName}${gemmaValue(parsed)}<tool_response|>`;
    } catch {
      // Plain string result
      return `<|tool_response>response:${toolName}{result:${q}${content}${q}}<tool_response|>`;
    }
  }

  /**
   * Format a tool call in Gemma 4 native syntax.
   * @internal — used by buildGemmaPrompt
   */
  static formatToolCall(name: string, input: Record<string, unknown>): string {
    const entries = Object.entries(input)
      .map(([k, v]) => `${k}:${gemmaValue(v)}`);
    return `<|tool_call>call:${name}{${entries.join(',')}}<tool_call|>`;
  }

  private buildPrompt(messages: ChatMessage[], tools: ProviderTool[], systemPrompt?: string): string {
    return buildGemmaPrompt({ systemPrompt, tools, messages });
  }

  destroy() {
    this.inference?.close?.();
    this.inference = null;
    this.setStatus('idle');
    this.initPromise = null;
  }
}

/**
 * Input for {@link buildGemmaPrompt}.
 *
 * Pass `messages: []` (or omit it) to produce a preview of the system/tool
 * portion of the prompt without any conversation turns — useful for debug
 * panels that want to display the exact transformed prompt Gemma will see.
 */
export interface BuildGemmaPromptInput {
  /** System prompt — expected to already be in Gemma native syntax (use
   *  `buildSystemPromptWithAliases(layers, { providerKind: 'gemma' })`).
   *  The tool declarations are embedded inside this system prompt — they are
   *  NOT re-emitted from `tools` by this function anymore. */
  systemPrompt?: string;
  /** Provider tools — used only for message serialization (tool_use / tool_result
   *  ID → name mapping). Declarations live inside `systemPrompt`. */
  tools: ProviderTool[];
  /** Conversation turns. Defaults to `[]` (preview mode — no `<|turn>` user/model blocks). */
  messages?: ChatMessage[];
}

/**
 * Build the final Gemma 4 native prompt string from a system prompt, a set of
 * provider tools, and a conversation history.
 *
 * This is the exact transformation applied by {@link WasmProvider} before
 * calling LlmInference — exported so UI debug panels can display the prompt
 * as it will actually be sent to the model.
 *
 * The system prompt is expected to already be in Gemma native syntax AND to
 * already embed the `<|tool>declaration>` blocks inline — build it with
 * `buildSystemPromptWithAliases(layers, { providerKind: 'gemma' })`.
 *
 * Transformations applied:
 * 1. Wraps the system prompt in `<|turn>system\n<|think|>\n...<turn|>` — this
 *    activates Gemma 4's native thinking mode so the model emits its internal
 *    reasoning inside a `<|channel>thought\n...<channel|>` block which is then
 *    stripped from the final user-visible output (see the streaming cleanup in
 *    {@link WasmProvider}).
 * 2. Serializes messages as `<|turn>user|model\n...<turn|>` with tool_use →
 *    `<|tool_call>`, tool_result → `<|tool_response>`.
 * 3. Terminates with an open `<|turn>model\n` for generation.
 * 4. No explicit `<bos>` — LlmInference adds it via the tokenizer.
 */
export function buildGemmaPrompt(input: BuildGemmaPromptInput): string {
  const { systemPrompt, messages = [] } = input;

  // Build a map of tool_use_id → tool_name from all messages for tool_result resolution
  const toolNameById = new Map<string, string>();
  for (const msg of messages) {
    if (typeof msg.content !== 'string') {
      for (const block of msg.content as ContentBlock[]) {
        if (block.type === 'tool_use') {
          const b = block as { type: 'tool_use'; id: string; name: string };
          toolNameById.set(b.id, b.name);
        }
      }
    }
  }

  const parts: string[] = [];

  // Gemma 4 native structure: the system prompt already embeds tool
  // declarations inline at each STEP (built via buildSystemPromptWithAliases
  // with providerKind: 'gemma').
  if (systemPrompt) {
    parts.push(`<|turn>system\n${systemPrompt}\n<turn|>`);
  }

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (typeof msg.content === 'string') {
      parts.push(`<|turn>${role}\n${msg.content}<turn|>`);
    } else {
      // Serialize all block types in Gemma 4 native format
      const segments: string[] = [];
      for (const block of msg.content as ContentBlock[]) {
        if (block.type === 'text') {
          segments.push((block as { type: 'text'; text: string }).text);
        } else if (block.type === 'tool_use') {
          const b = block as { type: 'tool_use'; name: string; input: Record<string, unknown> };
          segments.push(WasmProvider.formatToolCall(b.name, b.input));
        } else if (block.type === 'tool_result') {
          const b = block as { type: 'tool_result'; tool_use_id: string; content: string };
          const toolName = toolNameById.get(b.tool_use_id) ?? 'unknown';
          segments.push(WasmProvider.formatToolResponse(toolName, b.content));
        }
      }
      if (segments.length > 0) {
        parts.push(`<|turn>${role}\n${segments.join('\n')}<turn|>`);
      }
    }
  }
  parts.push('<|turn>model\n');
  return parts.join('\n');
}
