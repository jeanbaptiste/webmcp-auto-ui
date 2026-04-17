/**
 * WasmProvider — runs MediaPipe LlmInference directly on the main thread
 * No Web Worker needed — @mediapipe/tasks-genai is not compatible with ES module workers.
 * Uses dynamic import() to avoid bundling MediaPipe when only Claude is used.
 */
import type { LLMProvider, LLMResponse, ChatMessage, ProviderTool, WasmModelId, ContentBlock } from '../types.js';
import type { PipelineTrace } from '../pipeline-trace.js';

export type WasmStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WasmProviderOptions {
  model?: WasmModelId;
  contextSize?: number;  // MediaPipe maxTokens — default 4096
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
      maxTokens: this.opts.contextSize ?? 4096,
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
    options?: { signal?: AbortSignal; maxTokens?: number; temperature?: number; topK?: number; onToken?: (token: string) => void; system?: string; maxTools?: number }
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
    options?: { signal?: AbortSignal; maxTokens?: number; temperature?: number; topK?: number; onToken?: (token: string) => void; system?: string; maxTools?: number }
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
    let prompt = this.buildPrompt(messages, tools, options?.system, options?.maxTools);

    // Aggressive clipping: Gemma struggles with long conversations — dynamic cap based on context size
    const contextTokens = this.opts.contextSize ?? 4096;
    const MAX_MESSAGES = contextTokens <= 4096 ? 8 : contextTokens <= 8192 ? 16 : 32;
    while (messages.length > MAX_MESSAGES) {
      messages = messages.slice(1);
    }
    prompt = this.buildPrompt(messages, tools, options?.system, options?.maxTools);

    // Token-based clipping: if prompt is still too large, drop oldest messages
    const maxPromptTokens = (this.opts.contextSize ?? 4096) - 512;
    try {
      while (this.inference.sizeInTokens(prompt) > maxPromptTokens && messages.length > 1) {
        messages = messages.slice(1);
        prompt = this.buildPrompt(messages, tools, options?.system, options?.maxTools);
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
        // P2 fix: track if we have a complete tool call to enable early cancellation
        let hasCompleteToolCall = false;
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

          // Cancel immediately after complete tool call — don't let Gemma hallucinate
          if (!hasCompleteToolCall && fullText.includes('<tool_call|>')) {
            hasCompleteToolCall = true;
            // Check if there's a new tool_call opening after the last closing
            const lastEnd = fullText.lastIndexOf('<tool_call|>');
            const afterEnd = fullText.slice(lastEnd + '<tool_call|>'.length);
            if (!afterEnd.includes('<|tool_call>')) {
              // No new tool call — cancel immediately
              this.inference?.cancelProcessing();
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

    // Clean up hallucinated content after tool calls.
    // Gemma often hallucinates fake <|tool_response> blocks after <tool_call|>.
    // Strategy: keep only the FIRST complete tool call, strip everything after.
    const firstCallStart = fullText.indexOf('<|tool_call>');
    if (firstCallStart !== -1) {
      const firstCallEnd = fullText.indexOf('<tool_call|>', firstCallStart);
      if (firstCallEnd !== -1) {
        const afterFirstCall = fullText.slice(firstCallEnd + '<tool_call|>'.length);
        // Check if there's a REAL second tool call (not preceded by a fake tool_response)
        const nextCallStart = afterFirstCall.indexOf('<|tool_call>');
        if (nextCallStart !== -1) {
          // Check if there's a fake tool_response between the two calls
          const betweenCalls = afterFirstCall.slice(0, nextCallStart);
          if (betweenCalls.includes('<|tool_response>') || betweenCalls.includes('<tool_response|>')) {
            // Fake chained response — truncate after first tool call
            fullText = fullText.slice(0, firstCallEnd + '<tool_call|>'.length);
          }
          // Otherwise: legitimate multi-tool call, keep both
        } else {
          // No second tool call — truncate any trailing hallucination
          fullText = fullText.slice(0, firstCallEnd + '<tool_call|>'.length);
        }
      }
    }

    // Also strip any standalone <|tool_response> blocks in model output
    // (the model should never generate these — they're injected by the framework)
    fullText = fullText.replace(/<\|tool_response>[\s\S]*?<tool_response\|>/g, '');

    // Strip thinking blocks — Gemma 4 wraps reasoning in <|channel>thought\n...<channel|>
    fullText = fullText.replace(/<\|channel>thought[\s\S]*?<channel\|>/g, '');

    const latencyMs = performance.now() - t0;

    // Use sizeInTokens for accurate token count if available
    let realTokenCount = tokenCount;
    try {
      if (this.inference?.sizeInTokens) {
        realTokenCount = this.inference.sizeInTokens(fullText) ?? tokenCount;
      }
    } catch {}

    // Parse tool calls — supports multiple formats:
    // 1. Gemma 4 native: <|tool_call>call:tool_name{key:<|"|>value<|"|>}<tool_call|>
    // 2. JSON format (legacy): <|tool_call>call:tool_name{"key":"value"}<tool_call|>
    // 3. Loose JSON: { "tool": "name", "args": {...} }
    const content: ContentBlock[] = [];
    const gemmaToolCallRe = /<\|tool_call>call:(\w+)(\{[^]*?\})<tool_call\|>/g;
    // Fallback: parenthesized format — call:name("arg1", {arg2})
    const parenToolCallRe = /<\|tool_call>call:(\w+)\(([^)]*(?:\{[^]*?\}[^)]*)?)\)(?:<tool_call\|>|$)/g;
    let match: RegExpExecArray | null;
    let foundToolCall = false;

    while ((match = gemmaToolCallRe.exec(fullText)) !== null) {
      foundToolCall = true;
      const toolName = match[1];
      let toolArgs: Record<string, unknown> = {};
      const rawArgs = match[2];

      // Strategy 1: Extract key-value pairs using <|"|> delimiters BEFORE replacing them.
      // This correctly handles internal quotes like: query:<|"|>SELECT data."date"<|"|>
      toolArgs = WasmProvider.parseGemmaArgs(rawArgs);

      // Strategy 2: If no pairs found, try simple replacement + JSON.parse
      if (Object.keys(toolArgs).length === 0) {
        const argsStr = rawArgs.replace(/<\|"\|>/g, '"');
        try {
          toolArgs = JSON.parse(argsStr);
          this.trace?.push('parse', toolName, 'fell back to quote replacement strategy', 'warn');
        } catch {
          // Strategy 3: regex key:value extraction on replaced string
          try {
            const obj: Record<string, unknown> = {};
            const kvRe = /(\w+)\s*:\s*(?:"([^"]*)"|([\d.]+(?:e[+-]?\d+)?)|(\[.*?\])|(true|false|null))/g;
            let kv: RegExpExecArray | null;
            while ((kv = kvRe.exec(argsStr)) !== null) {
              const [, k, strVal, numVal, arrVal, litVal] = kv;
              if (strVal !== undefined) obj[k] = strVal;
              else if (numVal !== undefined) obj[k] = Number(numVal);
              else if (arrVal !== undefined) { try { obj[k] = JSON.parse(arrVal); } catch { obj[k] = arrVal; } }
              else if (litVal !== undefined) obj[k] = JSON.parse(litVal);
            }
            if (Object.keys(obj).length > 0) {
              toolArgs = obj;
              this.trace?.push('parse', toolName, 'fell back to regex key:value strategy', 'warn');
            }
          } catch {}
        }
      }

      // P4 fix: recursively parse string fields that look like JSON objects/arrays.
      // Gemma wraps params in <|"|>{...}<|"|> which after replacement becomes "{...}" — a string.
      for (const [k, v] of Object.entries(toolArgs)) {
        if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
          try { toolArgs[k] = JSON.parse(v); } catch { /* keep as string */ }
        }
      }

      content.push({
        type: 'tool_use',
        id: `tc-${Date.now()}-${content.length}`,
        name: toolName,
        input: toolArgs,
      });
    }

    // Fallback: try parenthesized format — call:component("table", {data: [...]})
    if (!foundToolCall) {
      while ((match = parenToolCallRe.exec(fullText)) !== null) {
        foundToolCall = true;
        const toolName = match[1];
        const argsRaw = match[2].replace(/<\|"\|>/g, '"').trim();
        let toolArgs: Record<string, unknown> = {};

        // Parse parenthesized args: could be ("name", {params}) or just ({params})
        try {
          // Try wrapping in array and parsing: ["name", {params}] or [{params}]
          const asArray = JSON.parse(`[${argsRaw}]`);
          if (asArray.length === 2 && typeof asArray[0] === 'string' && typeof asArray[1] === 'object') {
            // component("table", {data: [...]}) → {name: "table", params: {data: [...]}}
            toolArgs = { name: asArray[0], params: asArray[1] };
          } else if (asArray.length === 1 && typeof asArray[0] === 'object') {
            toolArgs = asArray[0];
          } else if (asArray.length >= 1) {
            // Generic: first string arg as name, rest as params
            toolArgs = { name: String(asArray[0]), ...(typeof asArray[1] === 'object' ? { params: asArray[1] } : {}) };
          }
        } catch {
          // Last resort: try parsing the whole thing as JSON object
          try { toolArgs = JSON.parse(argsRaw); } catch {}
        }

        content.push({
          type: 'tool_use',
          id: `tc-${Date.now()}-${content.length}`,
          name: toolName,
          input: toolArgs,
        });
      }
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
      usage: {
        input_tokens: inputTokenCount,
        output_tokens: realTokenCount,
      },
    };
  }

  /**
   * Parse Gemma native tool call args, handling internal quotes in values.
   * Extracts key-value pairs using <|"|> delimiters before any replacement,
   * so internal quotes like data."date" are preserved correctly.
   * Example: {schema:<|"|>assemblee<|"|>,query:<|"|>SELECT data."date"<|"|>}
   */
  private static parseGemmaArgs(raw: string): Record<string, unknown> {
    const pairs: Record<string, unknown> = {};

    // Extract string values delimited by <|"|>
    const kvRegex = /(\w+)\s*:\s*<\|"\|>([\s\S]*?)<\|"\|>/g;
    let m: RegExpExecArray | null;
    while ((m = kvRegex.exec(raw)) !== null) {
      pairs[m[1]] = m[2];
    }

    // Extract numeric values (no delimiters)
    const numRegex = /(\w+)\s*:\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*(?:[,}]|$)/g;
    while ((m = numRegex.exec(raw)) !== null) {
      if (!(m[1] in pairs)) pairs[m[1]] = Number(m[2]);
    }

    // Extract boolean/null literals
    const litRegex = /(\w+)\s*:\s*(true|false|null)\s*(?:[,}]|$)/g;
    while ((m = litRegex.exec(raw)) !== null) {
      if (!(m[1] in pairs)) pairs[m[1]] = JSON.parse(m[2]);
    }

    // Extract inline object/array values (e.g. params:{items:[...]}, data:{a:1})
    // Gemma often writes nested objects without <|"|> delimiters.
    // We find key:{ or key:[ and then match balanced braces/brackets.
    const objRe = /(\w+)\s*:\s*([{\[])/g;
    while ((m = objRe.exec(raw)) !== null) {
      if (m[1] in pairs) continue; // already captured by a higher-priority regex
      const key = m[1];
      const opener = m[2];
      const closer = opener === '{' ? '}' : ']';
      let depth = 1;
      let i = m.index + m[0].length;
      while (i < raw.length && depth > 0) {
        const ch = raw[i];
        if (ch === opener) depth++;
        else if (ch !== opener && (ch === '{' || ch === '[')) depth++;
        else if (ch === closer) depth--;
        else if (ch !== closer && (ch === '}' || ch === ']')) depth--;
        i++;
      }
      const fragment = raw.slice(m.index + m[0].length - 1, i); // includes opener and closer
      // Replace <|"|> with " for JSON parsing
      const jsonStr = fragment.replace(/<\|"\|>/g, '"');
      try { pairs[key] = JSON.parse(jsonStr); } catch { /* unparseable — skip */ }
    }

    // Try to parse string values that look like JSON objects/arrays
    for (const [k, v] of Object.entries(pairs)) {
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try { pairs[k] = JSON.parse(v); } catch { /* keep as string */ }
      }
    }

    return pairs;
  }

  /**
   * Format a value for Gemma 4 native tool syntax.
   * Strings use <|"|> delimiters, numbers/booleans/null are bare.
   */
  private static gemmaValue(v: unknown): string {
    const q = '<|"|>';
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return `[${v.map(i => WasmProvider.gemmaValue(i)).join(',')}]`;
    if (typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>)
        .map(([k, val]) => `${k}:${WasmProvider.gemmaValue(val)}`);
      return `{${entries.join(',')}}`;
    }
    return `${q}${String(v)}${q}`;
  }

  /**
   * Format a tool declaration in Gemma 4 native syntax.
   */
  private static formatToolDeclaration(tool: ProviderTool): string {
    const q = '<|"|>';
    let decl = `<|tool>declaration:${tool.name}{\n`;
    decl += `  description:${q}${tool.description}${q}`;

    const schema = tool.input_schema;
    if (schema?.properties) {
      const props = schema.properties as Record<string, { description?: string; type?: string; enum?: string[]; format?: string; default?: unknown }>;
      decl += `,\n  parameters:{\n    properties:{\n`;

      const propEntries = Object.entries(props);
      for (let i = 0; i < propEntries.length; i++) {
        const [key, val] = propEntries[i];
        decl += `      ${key}:{`;
        const parts: string[] = [];
        if (val.description) parts.push(`description:${q}${val.description}${q}`);
        // P1 fix: if no type specified, infer OBJECT for params-like fields to avoid
        // Gemma wrapping the value in <|"|>...<|"|> (treating it as a string)
        let inferredType = val.type;
        if (!inferredType) {
          const descLower = (val.description ?? '').toLowerCase();
          if (descLower.includes('objet') || descLower.includes('object') || descLower.includes('parameter') || descLower.includes('paramètre') || key === 'params') {
            inferredType = 'object';
          } else {
            inferredType = 'string';
          }
        }
        parts.push(`type:${q}${inferredType.toUpperCase()}${q}`);
        if (val.enum) parts.push(`enum:[${val.enum.map(e => `${q}${e}${q}`).join(',')}]`);
        if (val.format) parts.push(`format:${q}${val.format}${q}`);
        if (val.default !== undefined) parts.push(`default:${WasmProvider.gemmaValue(val.default)}`);
        decl += parts.join(',');
        decl += `}${i < propEntries.length - 1 ? ',' : ''}\n`;
      }

      decl += `    }`;
      if (schema.required && Array.isArray(schema.required)) {
        decl += `,\n    required:[${(schema.required as string[]).map(r => `${q}${r}${q}`).join(',')}]`;
      }
      decl += `,\n    type:${q}OBJECT${q}\n  }`;
    }

    decl += `\n}<tool|>`;
    return decl;
  }

  /**
   * Format a tool response in Gemma 4 native syntax.
   */
  private static formatToolResponse(toolName: string, content: string): string {
    const q = '<|"|>';
    // Try to parse as JSON for structured output
    try {
      const parsed = JSON.parse(content);
      return `<|tool_response>response:${toolName}${WasmProvider.gemmaValue(parsed)}<tool_response|>`;
    } catch {
      // Plain string result
      return `<|tool_response>response:${toolName}{result:${q}${content}${q}}<tool_response|>`;
    }
  }

  /**
   * Format a tool call in Gemma 4 native syntax.
   */
  private static formatToolCall(name: string, input: Record<string, unknown>): string {
    const entries = Object.entries(input)
      .map(([k, v]) => `${k}:${WasmProvider.gemmaValue(v)}`);
    return `<|tool_call>call:${name}{${entries.join(',')}}<tool_call|>`;
  }

  private buildPrompt(messages: ChatMessage[], tools: ProviderTool[], systemPrompt?: string, maxTools?: number): string {
    const systemParts: string[] = [];

    // Inject system prompt from settings if provided
    if (systemPrompt) {
      systemParts.push(systemPrompt);
    }

    if (tools.length > 0) {
      // Gemma small models struggle with too many tools — limit to most relevant
      const MAX_TOOLS = maxTools ?? 15;
      const limitedTools = tools.length > MAX_TOOLS
        ? [
            // Always include render_* tools (UI)
            ...tools.filter(t => t.name.startsWith('render_') || t.name === 'clear_canvas').slice(0, 8),
            // Fill with data tools
            ...tools.filter(t => !t.name.startsWith('render_') && t.name !== 'clear_canvas').slice(0, MAX_TOOLS - 8),
          ]
        : tools;

      // Native Gemma 4 tool declarations
      systemParts.push(limitedTools.map(t => WasmProvider.formatToolDeclaration(t)).join('\n'));
    }

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
    if (systemParts.length > 0) {
      // Gemma 4 has no system role — inject system content as a user turn
      parts.push(`<|turn>user\n${systemParts.join('\n')}<turn|>`);
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

  destroy() {
    this.inference?.close?.();
    this.inference = null;
    this.setStatus('idle');
    this.initPromise = null;
  }
}
