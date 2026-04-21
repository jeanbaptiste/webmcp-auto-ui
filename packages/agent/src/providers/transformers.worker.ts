/// <reference lib="webworker" />
/**
 * transformers.worker.ts — Web Worker that runs transformers.js v4 (ONNX + WebGPU).
 *
 * Protocol (see transformers.ts for the main-thread side):
 *   main → worker: { type: 'load', modelId, entry, contextSize }
 *   main → worker: { type: 'generate', requestId, options,
 *                    prompt?, chatMessages?, image? }
 *     - `prompt` is a pre-built string (Gemma wire format). Used as-is.
 *     - `chatMessages` is a [{role, content}] array that the worker feeds to
 *       tokenizer.apply_chat_template (Qwen / Mistral native chat_template).
 *     - For vision turns, `image` is attached; for Qwen/Mistral VLMs the
 *       worker applies the chat_template first, then passes the string to
 *       processor(prompt, raw).
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

/**
 * past_key_values slot. Populated transiently during a generate() call and
 * ALWAYS disposed before and after (see disposePastKeyValues()). The cache is
 * intra-generate only — `use_cache: true` in generateArgs keeps attention at
 * O(n) per token inside a single generate() — but it is NEVER retained across
 * generate() calls. Cross-turn reuse was removed in commit 9bb7d04 (perf:
 * re-enable intra-generate KV cache) after the earlier fix 98d7d57 that
 * disabled reuse entirely because of a SWA mask/score shape desync.
 */
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
    // Optional fallback import — module is shipped (../prompts/tool-call-parsers.ts);
    // the try/catch is defensive only, guarding against bundler quirks that
    // could drop the worker-side import.
    const mod: any = await import('../prompts/tool-call-parsers.js');
    const fn = mod.parseToolCalls ?? mod.default;
    if (typeof fn === 'function') return await fn(fullText, toolFormat);
  } catch {
    // Import resolution failed — fall through to stub.
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
    // Optional fallback import — module is shipped (../util/opfs-cache.ts);
    // the try/catch is defensive only, guarding against bundler quirks or
    // OPFS being unavailable in the worker (older browsers).
    const mod: any = await import('../util/opfs-cache.js');
    const fn = mod.loadOrDownloadModel ?? mod.default;
    if (typeof fn === 'function') return await fn(_repo, _onProgress);
  } catch {
    // Import/OPFS unavailable — transformers.js falls back to its internal
    // HTTP fetch + `caches` API. Progress arrives via from_pretrained's
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

  // Dynamic import — Web Workers don't inherit the document's import-map, so
  // the bare specifier can't resolve when externalized from the worker bundle.
  // Hardcode the CDN URL (mirrors the pin in app.html). Keep /* @vite-ignore */
  // to stop Vite from pre-resolving the runtime string.
  // Version pinning per family — Mistral3 was only fully wired (name → class
  // registry) in transformers.js 3.8.1; 4.1.0 regresses that path but adds
  // Gemma4/Qwen3.5. So route each family to the version that actually works.
  const TRANSFORMERS_URL = modelEntry.family === 'mistral'
    ? 'https://esm.sh/@huggingface/transformers@3.8.1'
    : 'https://esm.sh/@huggingface/transformers@4.1.0';
  const imported: any = await import(/* @vite-ignore */ TRANSFORMERS_URL);
  // Some CDN bundles park named exports under `.default`; flatten so the
  // destructure below finds them either way.
  transformersMod = imported?.AutoTokenizer ? imported : (imported?.default ?? imported);
  const topKeys = Object.keys(transformersMod ?? {});
  post({ type: 'warning', message: `[transformers] module loaded. ${topKeys.length} top-level keys. AutoTokenizer=${typeof transformersMod?.AutoTokenizer}, AutoModelForImageTextToText=${typeof transformersMod?.AutoModelForImageTextToText}, AutoModelForCausalLM=${typeof transformersMod?.AutoModelForCausalLM}` });
  const {
    AutoProcessor,
    AutoTokenizer,
    AutoModelForCausalLM,
    InterruptableStoppingCriteria,
    env,
  } = transformersMod;
  if (!AutoTokenizer || !AutoModelForCausalLM) {
    throw new Error(`[transformers] CDN module missing core exports. Keys seen: ${topKeys.slice(0, 40).join(',')}`);
  }

  // Point ONNX Runtime WASM binaries to the jsdelivr CDN so they're not bundled.
  // esm.sh hosts the JS modules; the native .wasm binaries are served by jsdelivr.
  try {
    if (env?.backends?.onnx?.wasm && modelEntry.family !== 'mistral') {
      // Only override for 4.1.0 / ORT 1.26 (we host the matching .wasm binaries
      // on jsdelivr). For the 3.8.1 path, ORT 1.22.0-dev is a transformers.js-
      // internal build not mirrored on jsdelivr — let transformers.js use its
      // default wasmPaths (which resolve against esm.sh, matching the JS bundle).
      env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260410-5e55544225/dist/';
    }
    if (env) {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
    }
  } catch {}

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

  // Aggregated progress callback — sums loaded/total across every file we see,
  // emitting a monotonic aggregate ratio. Two guards eliminate flicker:
  //   1. Files with total < 1_000_000 bytes are ignored (configs, tokenizers,
  //      chat_templates are all <100KB and would jump instantly to 100%,
  //      momentarily overwriting the big weight-shard progress).
  //   2. We emit sum(loaded) / sum(total) — so small-file completions cannot
  //      make the overall ratio regress.
  const fileStats = new Map<string, { loaded: number; total: number }>();
  const progressCallback = (p: any) => {
    if (p?.status !== 'progress' || typeof p?.file !== 'string') return;
    const loaded = typeof p.loaded === 'number' ? p.loaded : 0;
    const total = typeof p.total === 'number' && p.total > 0 ? p.total : 0;
    if (total < 1_000_000) return; // skip tiny files
    fileStats.set(p.file, { loaded, total });
    let sumLoaded = 0;
    let sumTotal = 0;
    for (const v of fileStats.values()) { sumLoaded += v.loaded; sumTotal += v.total; }
    const fp = sumTotal > 0 ? sumLoaded / sumTotal : 0;
    post({
      type: 'progress',
      fileProgress: fp,
      totalProgress: fp,
      status: 'downloading',
      loaded: sumLoaded,
      total: sumTotal,
    });
  };

  // No progress_callback: OPFS already pre-downloaded every weight, so
  // from_pretrained reads from browser cache. Wiring progress_callback here
  // made the loader flicker because each sub-ONNX (embed/decoder/vision/audio)
  // fires its own 0→100% event, overwriting the aggregated OPFS progress.
  const fromPretrainedOpts = {
    dtype: modelEntry.dtype,
    device: 'webgpu' as const,
    progress_callback: progressCallback,
  };
  post({
    type: 'progress',
    fileProgress: 1,
    totalProgress: 1,
    status: 'initializing model weights',
    loaded: modelEntry.size,
    total: modelEntry.size,
  });

  // Tokenizer + processor — processor is required for VLMs and harmless otherwise.
  // No progress_callback here: OPFS already downloaded every file, so transformers.js
  // just reads from cache. Wiring a progress_callback would flicker the UI between
  // the big decoder bar and tiny tokenizer/config progress events.
  post({
    type: 'progress',
    fileProgress: 1,
    totalProgress: 1,
    status: 'initializing tokenizer',
    loaded: modelEntry.size,
    total: modelEntry.size,
  });
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
  if (modelEntry.modelClass) {
    const resolved = transformersMod[modelEntry.modelClass];
    if (resolved && typeof resolved.from_pretrained === 'function') {
      ModelClass = resolved;
      post({ type: 'warning', message: `[transformers] using ModelClass=${modelEntry.modelClass}` });
    } else {
      const autoKeys = Object.keys(transformersMod).filter((k) => k.startsWith('AutoModel') || k.includes('ForConditional') || k.includes('ForImageText')).join(',');
      post({ type: 'warning', message: `[transformers] modelClass '${modelEntry.modelClass}' not found. Available Auto* keys: ${autoKeys}. Falling back to AutoModelForCausalLM.` });
    }
  }
  if (!ModelClass || typeof ModelClass.from_pretrained !== 'function') {
    throw new Error(`[transformers] No usable model class. AutoModelForCausalLM=${typeof AutoModelForCausalLM}, mod keys sample: ${Object.keys(transformersMod).slice(0, 20).join(',')}`);
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
  prompt: string | undefined,
  chatMessages: Array<{ role: string; content: string }> | undefined,
  options: GenerateOptions,
  image?: Uint8Array,
): Promise<void> {
  if (!model || !entry) {
    post({ type: 'error', requestId, message: 'model not loaded' });
    return;
  }

  activeRequestId = requestId;

  const { TextStreamer, RawImage } = transformersMod;

  // If the main thread sent chatMessages, apply the tokenizer's native
  // chat_template (Jinja) now. This is how Qwen3 and Mistral produce correctly
  // tagged prompts (<|im_start|>user … / [INST] …). Falling back to the raw
  // string lets the Gemma path (custom wire format) keep working unchanged.
  let effectivePrompt: string | undefined;
  if (chatMessages && entry.family === 'mistral' && processor && typeof processor.apply_chat_template === 'function') {
    try {
      effectivePrompt = processor.apply_chat_template(chatMessages);
    } catch (err) {
      post({ type: 'warning', message: `processor.apply_chat_template failed, falling back to tokenizer: ${String(err)}` });
      // fall through to tokenizer branch below
    }
  }
  if (!effectivePrompt && chatMessages && tokenizer && typeof tokenizer.apply_chat_template === 'function') {
    try {
      effectivePrompt = tokenizer.apply_chat_template(chatMessages, {
        tokenize: false,
        add_generation_prompt: true,
      });
    } catch (err) {
      post({ type: 'warning', message: `apply_chat_template failed, falling back to raw concat: ${String(err)}` });
      effectivePrompt = chatMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    }
  }
  if (!effectivePrompt && typeof prompt === 'string') {
    effectivePrompt = prompt;
  }
  if (!effectivePrompt) {
    post({ type: 'error', requestId, message: 'generate requires either prompt or chatMessages' });
    activeRequestId = null;
    return;
  }

  const t0 = performance.now();
  let tokenCount = 0;
  let fullText = '';

  const streamerTokenizer = entry.family === 'mistral' ? (processor?.tokenizer ?? tokenizer) : tokenizer;
  const streamer = new TextStreamer(streamerTokenizer, {
    skip_prompt: true,
    skip_special_tokens: entry.family === 'mistral',
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
  // KV reuse is disabled: the agent loop rebuilds the full prompt each turn,
  // so reusing past_key_values double-prefixes and triggers mask/score shape
  // mismatches (Where node broadcast error on dim 3).
  disposePastKeyValues();
  let inputs: any;
  let isVisionTurn = false;
  try {
    if (image && processor && entry.vision) {
      isVisionTurn = true;
      const blob = new Blob([image]);
      const raw: any = await RawImage.read(blob);
      // Mistral/Pixtral: let image_processor drive sizing (longest_edge), do NOT force 448×448.
      if (entry.family === 'mistral' && processor.image_processor) {
        try { processor.image_processor.size = { longest_edge: 480 }; } catch {}
      } else {
        try { raw.resize?.(448, 448); } catch {}
      }
      // processor(images, text, opts) — ARG ORDER MATTERS for Pixtral processor.
      inputs = await processor(raw, effectivePrompt, { add_special_tokens: false });
    } else if (tokenizer) {
      // Text-only turn — always go through the tokenizer, even on a VLM.
      // VLM processors (Qwen3.5, Mistral3, Gemma4) expect messages-with-content-
      // blocks rather than a plain prompt string, so calling processor(prompt)
      // throws "X is not iterable" on the template path.
      inputs = await tokenizer(effectivePrompt, { return_tensors: 'pt' });
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
    // Keep the intra-generate KV cache (O(n) per token vs O(n²)). The SWA
    // desync bug only manifested when past_key_values were reused ACROSS
    // generate() calls, which we now prevent via disposePastKeyValues()
    // before each call.
    use_cache: true,
    // Sampling defaults — without these transformers.js degenerates into
    // single-token loops ("Salut! Salut! Salut!...") on Qwen3 especially.
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
    top_p: 0.9,
    top_k: typeof options.topK === 'number' ? options.topK : 50,
    repetition_penalty: 1.1,
    streamer,
    stopping_criteria: stoppingCriteria,
  };
  // past_key_values deliberately never reused (see comment above).

  if (entry.family === 'mistral') {
    generateArgs.do_sample = false;
    generateArgs.repetition_penalty = 1.2;
    delete generateArgs.temperature;
    delete generateArgs.top_p;
    delete generateArgs.top_k;
    delete generateArgs.return_dict_in_generate;
    delete generateArgs.stopping_criteria;
  }

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

  // KV cache intentionally not retained — the agent loop re-sends the full
  // prompt each turn, so a stale cache would double-prefix and break shapes.
  try { if (result?.past_key_values) {
    if (typeof result.past_key_values === 'object') {
      for (const v of Object.values(result.past_key_values) as any[]) {
        try { v?.dispose?.(); } catch {}
      }
    }
  } } catch {}

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
        const prompt: string | undefined = typeof msg.prompt === 'string' ? msg.prompt : undefined;
        const chatMessages: Array<{ role: string; content: string }> | undefined =
          Array.isArray(msg.chatMessages) ? msg.chatMessages : undefined;
        const options: GenerateOptions = msg.options ?? {};
        const image: Uint8Array | undefined = msg.image instanceof Uint8Array ? msg.image : undefined;
        await handleGenerate(requestId, prompt, chatMessages, options, image);
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
