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

import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

const LITERT_MODELS: Record<string, { repo: string; file: string }> = {
  'gemma-e2b': { repo: 'litert-community/gemma-4-E2B-it-litert-lm', file: 'gemma-4-E2B-it-web.task' },
  'gemma-e4b': { repo: 'litert-community/gemma-4-E4B-it-litert-lm', file: 'gemma-4-E4B-it-web.task' },
};

let inference: LlmInference | null = null;
let cancelRequested = false;

/**
 * Download a model file with OPFS caching.
 * Falls back to a fresh download if the cache miss occurs.
 */
async function getCachedOrDownload(
  url: string,
  filename: string,
  progressCb: (p: number, loaded: number, total: number) => void
): Promise<Uint8Array> {
  const root = await navigator.storage.getDirectory();
  const modelsDir = await root.getDirectoryHandle('webmcp-models', { create: true });

  try {
    // Try cache first
    const cached = await modelsDir.getFileHandle(filename);
    const file = await cached.getFile();
    progressCb(1, file.size, file.size);
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    // Cache miss — download
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

  const total = parseInt(response.headers.get('content-length') ?? '0', 10);
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    progressCb(total > 0 ? loaded / total : 0, loaded, total);
  }

  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  // Store in OPFS for next time
  try {
    const handle = await modelsDir.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    await writable.write(buffer);
    await writable.close();
  } catch {
    // OPFS write failure is non-fatal — model still usable
  }

  return buffer;
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

      const modelBuffer = await getCachedOrDownload(url, file, (p, loaded, total) => {
        self.postMessage({ type: 'progress', progress: p, status: 'downloading', loaded, total });
      });

      self.postMessage({ type: 'progress', progress: 1, status: 'initializing', loaded: 0, total: 0 });

      // Resolve the GenAI WASM fileset
      const genaiFileset = await FilesetResolver.forGenAiTasks(
        // Use the CDN path for the WASM binaries
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm'
      );

      // Create WebGPU device if available
      let gpuDevice: GPUDevice | undefined;
      try {
        gpuDevice = await LlmInference.createWebGpuDevice();
      } catch {
        // WebGPU not available — fall back to CPU/WASM
      }

      inference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetBuffer: modelBuffer,
          ...(gpuDevice ? { delegate: 'GPU' } : {}),
        },
        ...(gpuDevice ? { gpuOptions: { device: gpuDevice } } : {}),
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

    // Apply per-request options if provided
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

        // partialResult is the newly generated chunk
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

      // If the progressListener didn't fire 'done', handle the final result here
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
