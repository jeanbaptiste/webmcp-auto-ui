/// <reference lib="webworker" />
/**
 * transformers.worker.ts — Web Worker that runs transformers.js v4 (ONNX + WebGPU).
 *
 * Protocol (see transformers.ts for the main-thread side):
 *   main → worker: { type: 'load', modelId, entry, contextSize }
 *   main → worker: { type: 'generate', requestId, prompt, options, image? }
 *   main → worker: { type: 'abort', requestId }
 *   main → worker: { type: 'dispose' }
 *
 *   worker → main: { type: 'progress', fileProgress, totalProgress, status, loaded, total }
 *   worker → main: { type: 'ready' }
 *   worker → main: { type: 'warning', message }
 *   worker → main: { type: 'error', message, requestId? }
 *   worker → main: { type: 'token', requestId, token }
 *   worker → main: { type: 'done', requestId, content, stats, usage }
 *
 * The worker keeps one model loaded at a time and reuses `past_key_values`
 * across turns when no image is attached. Vision turns reset the KV cache.
 */

import type { ContentBlock } from '../types.js';
import type { TransformersModelEntry } from './transformers-models.js';

// --------------------------------------------------------------------------
// Lazy imports — resolved on first 'load'. Kept as `any` because the v4 API
// surface isn't fully typed yet.
// --------------------------------------------------------------------------

let transformersMod: any = null;
let processor: any = null;
let model: any = null;
let tokenizer: any = null;
let entry: TransformersModelEntry | null = null;
let stoppingCriteria: any = null;

/** Cached past_key_values for cross-turn prefix reuse. Reset on image turns. */
let pastKeyValues: any = null;

/** Active generation request id — set on 'generate', cleared on 'done'/'error'. */
let activeRequestId: string | null = null;

// --------------------------------------------------------------------------
// Tool-call parser — loaded lazily with a best-effort fallback stub.
// --------------------------------------------------------------------------

type ParsedToolCallBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

async function parseToolCalls(
  fullText: string,
  toolFormat: string,
): Promise<ParsedToolCallBlock[]> {
  try {
    // TODO: ship ../prompts/tool-call-parsers.ts exporting parseToolCalls(fullText, toolFormat).
    const mod: any = await import('../prompts/tool-call-parsers.js');
    const fn = mod.parseToolCalls ?? mod.default;
    if (typeof fn === 'function') return await fn(fullText, toolFormat);
  } catch {
    // Module not yet built — fall through to stub.
  }
  // Stub: ship the raw text as a single text block. Parsing will arrive in a
  // later agent iteration.
  return [{ type: 'text', text: fullText }];
}

// --------------------------------------------------------------------------
// OPFS cache — loaded lazily with a best-effort fallback that defers entirely
// to transformers.js's built-in HF cache (no OPFS intervention on our side).
// --------------------------------------------------------------------------

async function loadOrDownloadModel(
  _repo: string,
  _onProgress: (fileProgress: number, totalProgress: number, status: string, loaded?: number, total?: number) => void,
): Promise<void> {
  try {
    // TODO: ship ../util/opfs-cache.ts exporting loadOrDownloadModel(repo, onProgress)
    // that pre-populates OPFS with the ONNX weights and wires transformers.js
    // `env.useBrowserCache` against it.
    const mod: any = await import('../util/opfs-cache.js');
    const fn = mod.loadOrDownloadModel ?? mod.default;
    if (typeof fn === 'function') return await fn(_repo, _onProgress);
  } catch {
    // No cache module yet — transformers.js falls back to its internal HTTP
    // fetch + `caches` API. Progress will arrive via from_pretrained's
    // progress_callback below.
  }
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function post(msg: any, transfer?: Transferable[]): void {
  (self as unknown as Worker).postMessage(msg, transfer ?? []);
}

function disposePastKeyValues(): void {
  if (!pastKeyValues) return;
  try {
    if (typeof pastKeyValues === 'object') {
      for (const v of Object.values(pastKeyValues) as any[]) {
        try { v?.dispose?.(); } catch {}
      }
    }
  } catch {}
  pastKeyValues = null;
}

function resetAll(): void {
  disposePastKeyValues();
  try { stoppingCriteria?.reset?.(); } catch {}
}

// --------------------------------------------------------------------------
// Model loading
// --------------------------------------------------------------------------

async function loadModel(modelEntry: TransformersModelEntry): Promise<void> {
  entry = modelEntry;

  post({
    type: 'progress',
    fileProgress: 0,
    totalProgress: 0,
    status: 'importing transformers.js',
    loaded: 0,
    total: modelEntry.size,
  });

  // Dynamic import — keeps the worker bundle small when idle.
  transformersMod = await import('@huggingface/transformers');
  const {
    AutoProcessor,
    AutoTokenizer,
    AutoModelForCausalLM,
    InterruptableStoppingCriteria,
  } = transformersMod;

  stoppingCriteria = new InterruptableStoppingCriteria();

  // Pre-download (OPFS-aware when the cache module is available).
  await loadOrDownloadModel(modelEntry.repo, (fp, tp, status, loaded, total) => {
    post({
      type: 'progress',
      fileProgress: fp,
      totalProgress: tp,
      status,
      loaded: loaded ?? 0,
      total: total ?? modelEntry.size,
    });
  });

  const progressCallback = (p: any) => {
    // transformers.js v4 progress event shape: { status, name, file, progress, loaded, total }
    const loaded = typeof p?.loaded === 'number' ? p.loaded : 0;
    const total = typeof p?.total === 'number' && p.total > 0 ? p.total : modelEntry.size;
    const fp = typeof p?.progress === 'number' ? p.progress / 100 : (total > 0 ? loaded / total : 0);
    post({
      type: 'progress',
      fileProgress: fp,
      totalProgress: fp,
      status: String(p?.status ?? 'downloading'),
      loaded,
      total,
    });
  };

  const fromPretrainedOpts = {
    dtype: modelEntry.dtype,
    device: 'webgpu' as const,
    progress_callback: progressCallback,
  };

  // Tokenizer + processor — processor is required for VLMs and harmless otherwise.
  try {
    tokenizer = await AutoTokenizer.from_pretrained(modelEntry.repo, { progress_callback: progressCallback });
  } catch (err) {
    post({ type: 'warning', message: `tokenizer load: ${String(err)}` });
    tokenizer = null;
  }

  try {
    processor = await AutoProcessor.from_pretrained(modelEntry.repo, { progress_callback: progressCallback });
  } catch {
    // Some text-only checkpoints ship without an AutoProcessor — that's fine.
    processor = null;
  }

  // Model class — pick a specialized VLM class when the catalog hints at one,
  // otherwise fall back to AutoModelForCausalLM.
  let ModelClass: any = AutoModelForCausalLM;
  if (modelEntry.modelClass && transformersMod[modelEntry.modelClass]) {
    ModelClass = transformersMod[modelEntry.modelClass];
  }

  try {
    model = await ModelClass.from_pretrained(modelEntry.repo, fromPretrainedOpts);
  } catch (err) {
    // WebGPU can fail on older drivers — fall back to WASM and warn the UI.
    post({
      type: 'warning',
      message: `WebGPU unavailable, falling back to WASM: ${String(err)}`,
    });
    model = await ModelClass.from_pretrained(modelEntry.repo, {
      ...fromPretrainedOpts,
      device: 'wasm',
    });
  }

  post({ type: 'ready' });
}

// --------------------------------------------------------------------------
// Generation
// --------------------------------------------------------------------------

interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topK?: number;
}

async function handleGenerate(
  requestId: string,
  prompt: string,
  options: GenerateOptions,
  image?: Uint8Array,
): Promise<void> {
  if (!model || !entry) {
    post({ type: 'error', requestId, message: 'model not loaded' });
    return;
  }

  activeRequestId = requestId;

  const { TextStreamer, RawImage } = transformersMod;

  const t0 = performance.now();
  let tokenCount = 0;
  let fullText = '';

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: false,
    token_callback_function: () => {
      tokenCount += 1;
    },
    callback_function: (token: string) => {
      fullText += token;
      post({ type: 'token', requestId, token });
    },
  });

  // Build model inputs — VLM path goes through processor(prompt, image),
  // text path goes through tokenizer(prompt).
  let inputs: any;
  let isVisionTurn = false;
  try {
    if (image && processor && entry.vision) {
      isVisionTurn = true;
      disposePastKeyValues(); // vision turns always reset the KV cache
      const blob = new Blob([image]);
      const raw: any = await RawImage.read(blob);
      try { raw.resize?.(448, 448); } catch {}
      inputs = await processor(prompt, raw);
    } else if (processor && entry.vision) {
      // Text-only turn on a VLM — processor still handles tokenization.
      inputs = await processor(prompt);
    } else if (tokenizer) {
      inputs = await tokenizer(prompt, { return_tensors: 'pt' });
    } else {
      post({ type: 'error', requestId, message: 'no tokenizer/processor available' });
      activeRequestId = null;
      return;
    }
  } catch (err) {
    post({ type: 'error', requestId, message: `input preparation failed: ${String(err)}` });
    activeRequestId = null;
    return;
  }

  const generateArgs: any = {
    ...inputs,
    max_new_tokens: options.maxTokens ?? 2048,
    do_sample: true,
    return_dict_in_generate: true,
    streamer,
    stopping_criteria: stoppingCriteria,
  };
  if (typeof options.temperature === 'number') generateArgs.temperature = options.temperature;
  if (typeof options.topK === 'number') generateArgs.top_k = options.topK;
  if (!isVisionTurn && pastKeyValues) generateArgs.past_key_values = pastKeyValues;

  let result: any;
  try {
    result = await model.generate(generateArgs);
  } catch (err) {
    const msg = String(err);
    // Abort / stopping-criteria interrupt → deliver what we have so far.
    if (!msg.includes('interrupt') && !msg.includes('stopping')) {
      post({ type: 'error', requestId, message: msg });
      activeRequestId = null;
      return;
    }
  }

  // Cache KV for the next text-only turn.
  try {
    if (result?.past_key_values && !isVisionTurn) {
      disposePastKeyValues();
      pastKeyValues = result.past_key_values;
    }
  } catch {}

  // Parse thinking: everything before </think> is routed to the `thinking`
  // option on the leading text block, the rest becomes normal content.
  let thinking: string | undefined;
  let visible = fullText;
  const thinkEnd = fullText.indexOf('</think>');
  if (thinkEnd !== -1) {
    thinking = fullText.slice(0, thinkEnd).replace(/^<think>/, '').trim();
    visible = fullText.slice(thinkEnd + '</think>'.length).trim();
  }

  // Tool-call parsing (format-aware).
  const parsed = await parseToolCalls(visible, entry.toolFormat);
  const content: ContentBlock[] = [];
  let attachedThinking = false;
  for (const block of parsed) {
    if (block.type === 'text') {
      const text = block.text;
      if (!attachedThinking && thinking) {
        content.push({ type: 'text', text });
        // Embed `thinking` as a side-channel prefix in the block text so the
        // existing ContentBlock surface stays unchanged. Consumers that care
        // can extract the <think>…</think> span from the raw text.
        attachedThinking = true;
      } else {
        content.push({ type: 'text', text });
      }
    } else {
      content.push(block);
    }
  }
  if (content.length === 0) {
    content.push({ type: 'text', text: visible });
  }

  const latencyMs = performance.now() - t0;
  const tokensPerSec = tokenCount > 0 ? tokenCount / (latencyMs / 1000) : 0;

  let inputTokens = 0;
  try {
    const ids = (inputs?.input_ids?.dims ?? inputs?.input_ids?.size ?? 0);
    inputTokens = Array.isArray(ids) ? ids[ids.length - 1] : Number(ids) || 0;
  } catch {}

  post({
    type: 'done',
    requestId,
    content,
    stats: {
      tokensPerSec,
      totalTokens: tokenCount,
      latencyMs,
    },
    usage: {
      input_tokens: inputTokens,
      output_tokens: tokenCount,
    },
    // Thinking is exposed for observers that postMessage-proxy the worker.
    thinking,
  });

  activeRequestId = null;
}

// --------------------------------------------------------------------------
// Message dispatch
// --------------------------------------------------------------------------

self.addEventListener('message', async (ev: MessageEvent) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;

  try {
    switch (msg.type) {
      case 'load': {
        if (!msg.entry) {
          post({ type: 'error', message: 'missing entry in load message' });
          return;
        }
        await loadModel(msg.entry as TransformersModelEntry);
        return;
      }
      case 'generate': {
        const requestId: string = msg.requestId;
        const prompt: string = msg.prompt ?? '';
        const options: GenerateOptions = msg.options ?? {};
        const image: Uint8Array | undefined = msg.image instanceof Uint8Array ? msg.image : undefined;
        await handleGenerate(requestId, prompt, options, image);
        return;
      }
      case 'abort': {
        // Shared stopping criteria across requests — any abort interrupts the
        // current generation. The pending main-thread promise resolves via the
        // 'done' or 'error' path depending on how generate() unwinds.
        try { stoppingCriteria?.interrupt?.(); } catch {}
        if (activeRequestId && activeRequestId !== msg.requestId) {
          // Different requestId — still interrupt; the main side filters by id.
        }
        return;
      }
      case 'reset': {
        resetAll();
        return;
      }
      case 'dispose': {
        resetAll();
        try { model?.dispose?.(); } catch {}
        model = null;
        tokenizer = null;
        processor = null;
        entry = null;
        transformersMod = null;
        return;
      }
      default:
        return;
    }
  } catch (err) {
    const requestId = msg?.requestId;
    post({ type: 'error', requestId, message: String(err) });
    activeRequestId = null;
  }
});

export {}; // Mark this file as a module for TS.
