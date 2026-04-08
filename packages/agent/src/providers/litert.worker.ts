/**
 * LiteRT Worker — MediaPipe LlmInference backend
 * Uses @mediapipe/tasks-genai with WebGPU for Gemma 4 models
 *
 * Messages IN:  { type: 'init', model?: string }
 *               { type: 'chat', id: string, prompt: string, maxTokens?: number, temperature?: number, topK?: number }
 *               { type: 'abort', id: string }
 * Messages OUT: { type: 'progress', progress: number, status: string, loaded?: number, total?: number }
 *               { type: 'ready' }
 *               { type: 'token', id: string, token: string }
 *               { type: 'done', id: string, text: string, stats?: { tokensPerSec: number, totalTokens: number, latencyMs: number } }
 *               { type: 'error', id: string | null, message: string }
 */

/**
 * CRITICAL POLYFILL for module workers.
 *
 * @mediapipe/tasks-genai loads WASM support scripts with this runtime check:
 *
 *   async function lr(url) {
 *     if (typeof importScripts !== "function") {
 *       document.createElement("script") …   // crashes in a worker (no DOM)
 *     }
 *     try { importScripts(url) } catch (e) {
 *       if (!(e instanceof TypeError)) throw e;
 *       await self.import(url);               // dynamic-import fallback
 *     }
 *   }
 *
 * In ES module workers `importScripts` is undefined, so the library falls
 * into the DOM branch and crashes.  We install a stub that throws TypeError
 * so the library takes the worker branch and reaches `self.import()` which
 * works perfectly in module workers.
 *
 * This works because `lr()` checks `typeof importScripts` at CALL TIME (when
 * FilesetResolver.forGenAiTasks() runs), not at module parse time.  The
 * polyfill is set up synchronously at module load, well before any API call.
 */
if (typeof (globalThis as any).importScripts !== 'function') {
  (globalThis as any).importScripts = (..._args: string[]) => {
    throw new TypeError('importScripts is not supported in module workers');
  };
}
// MediaPipe falls back to `self.import(url)` which doesn't exist in Chrome.
// Provide it as an alias to dynamic `import()`.
if (typeof (self as any).import !== 'function') {
  (self as any).import = (url: string) => import(/* @vite-ignore */ url);
}

import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

const LITERT_MODELS: Record<string, { repo: string; file: string }> = {
  'gemma-e2b': { repo: 'litert-community/gemma-4-E2B-it-litert-lm', file: 'gemma-4-E2B-it-web.task' },
  'gemma-e4b': { repo: 'litert-community/gemma-4-E4B-it-litert-lm', file: 'gemma-4-E4B-it-web.task' },
};

let inference: LlmInference | null = null;
let cancelRequested = false;

/**
 * Download model with OPFS caching, returning a ReadableStream.
 * Follows the same streaming pattern as the official MediaPipe sample:
 * the stream reader is passed directly to LlmInference as modelAssetBuffer
 * to avoid buffering multi-GB models entirely in RAM.
 */
async function getModelStream(
  url: string,
  filename: string,
  progressCb: (p: number, loaded: number, total: number) => void,
): Promise<ReadableStream<Uint8Array>> {
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

self.onmessage = async (e: MessageEvent) => {
  const { type, id, model: modelId, prompt } = e.data as {
    type: string; id?: string; model?: string; prompt?: string;
  };

  if (type === 'init') {
    try {
      const key = modelId ?? 'gemma-e2b';
      const { repo, file } = LITERT_MODELS[key] ?? LITERT_MODELS['gemma-e2b'];
      const url = `https://huggingface.co/${repo}/resolve/main/${file}`;

      self.postMessage({ type: 'progress', progress: 0, status: 'downloading', loaded: 0, total: 0 });

      const modelStream = await getModelStream(url, file, (p, loaded, total) => {
        self.postMessage({ type: 'progress', progress: p, status: 'downloading', loaded, total });
      });

      self.postMessage({ type: 'progress', progress: 1, status: 'initializing', loaded: 0, total: 0 });

      // Resolve the GenAI WASM fileset from CDN (pinned version).
      // Second arg = true → use the ES module variant (genai_wasm_module_internal.js)
      // so that `self.import()` works correctly in the module worker fallback path.
      const genaiFileset = await FilesetResolver.forGenAiTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm',
        /* useModuleVariant */ true,
      );

      // WebGPU device is required for LiteRT models
      const gpuDevice = await LlmInference.createWebGpuDevice();

      // Pass stream reader as modelAssetBuffer — same pattern as the official
      // MediaPipe sample (avoids buffering the entire model in RAM).
      // The MediaPipe API accepts ReadableStreamDefaultReader in this slot.
      inference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetBuffer: modelStream.getReader() as unknown as Uint8Array,
          delegate: 'GPU',
        },
        gpuOptions: { device: gpuDevice },
        maxTokens: 8192,
        temperature: 0.7,
        topK: 40,
      });

      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', id: null, message: String(err) });
    }
    return;
  }

  if (type === 'chat' && id && prompt) {
    if (!inference) {
      self.postMessage({ type: 'error', id, message: 'Model not initialized' });
      return;
    }

    const maxTokens = (e.data as { maxTokens?: number }).maxTokens;
    const temperature = (e.data as { temperature?: number }).temperature;
    const topK = (e.data as { topK?: number }).topK;

    if (maxTokens !== undefined || temperature !== undefined || topK !== undefined) {
      try {
        await inference.setOptions({
          ...(maxTokens !== undefined ? { maxTokens } : {}),
          ...(temperature !== undefined ? { temperature } : {}),
          ...(topK !== undefined ? { topK } : {}),
        });
      } catch {
        // setOptions failure is non-fatal — use defaults
      }
    }

    cancelRequested = false;
    let fullText = '';
    let tokenCount = 0;
    const t0 = performance.now();

    try {
      const result = await inference.generateResponse(prompt, (partialResult: string, done: boolean) => {
        if (cancelRequested) {
          inference?.cancelProcessing();
          return;
        }

        fullText += partialResult;
        tokenCount++;
        self.postMessage({ type: 'token', id, token: partialResult });

        if (done) {
          const latencyMs = performance.now() - t0;
          self.postMessage({
            type: 'done',
            id,
            text: fullText,
            stats: {
              tokensPerSec: tokenCount / (latencyMs / 1000),
              totalTokens: tokenCount,
              latencyMs,
            },
          });
        }
      });

      // Fallback if the streaming callback didn't fire 'done'
      if (result && !fullText) {
        fullText = result;
        const latencyMs = performance.now() - t0;
        self.postMessage({
          type: 'done',
          id,
          text: fullText,
          stats: {
            tokensPerSec: tokenCount / (latencyMs / 1000),
            totalTokens: tokenCount,
            latencyMs,
          },
        });
      }
    } catch (err) {
      const msg = String(err);
      if (cancelRequested || msg.includes('cancel')) {
        const latencyMs = performance.now() - t0;
        self.postMessage({
          type: 'done',
          id,
          text: fullText,
          stats: {
            tokensPerSec: tokenCount > 0 ? tokenCount / (latencyMs / 1000) : 0,
            totalTokens: tokenCount,
            latencyMs,
          },
        });
      } else {
        self.postMessage({ type: 'error', id, message: msg });
      }
    }
    return;
  }

  if (type === 'abort' && id) {
    cancelRequested = true;
    inference?.cancelProcessing();
    return;
  }
};
