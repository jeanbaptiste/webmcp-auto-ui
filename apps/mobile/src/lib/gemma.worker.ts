/**
 * Gemma E2B Web Worker
 * Uses @huggingface/transformers v3+ with WebGPU
 * Requires COOP/COEP headers for SharedArrayBuffer
 *
 * Messages IN:  { type: 'init', model?: string }
 *               { type: 'chat', id: string, prompt: string }
 *               { type: 'abort', id: string }
 * Messages OUT: { type: 'progress', progress: number, status: string }
 *               { type: 'ready' }
 *               { type: 'token', id: string, token: string }
 *               { type: 'done', id: string, text: string }
 *               { type: 'error', id: string | null, message: string }
 */

import { pipeline, TextStreamer, env } from '@huggingface/transformers';

// Use ONNX model from HuggingFace hub
env.allowLocalModels = false;

const DEFAULT_MODEL = 'onnx-community/gemma-3-1b-it-ONNX';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let generator: any = null;
const abortControllers = new Map<string, AbortController>();

self.onmessage = async (e: MessageEvent) => {
  const { type, id, model, prompt } = e.data as {
    type: string; id?: string; model?: string; prompt?: string;
  };

  if (type === 'init') {
    try {
      generator = await pipeline('text-generation', model ?? DEFAULT_MODEL, {
        device: typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm',
        dtype: 'q4',
        progress_callback: (p: { status: string; progress?: number; name?: string; loaded?: number; total?: number }) => {
          self.postMessage({
            type: 'progress',
            progress: p.progress ?? 0,
            status: p.status,
            name: p.name ?? '',
            loaded: p.loaded ?? 0,
            total: p.total ?? 0,
          });
        },
      });
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', id: null, message: String(err) });
    }
    return;
  }

  if (type === 'chat' && id && prompt) {
    if (!generator) {
      self.postMessage({ type: 'error', id, message: 'Model not initialized' });
      return;
    }

    const ac = new AbortController();
    abortControllers.set(id, ac);
    let fullText = '';

    try {
      const streamer = new TextStreamer(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (generator as any).tokenizer,
        {
          skip_prompt: true,
          callback_function: (token: string) => {
            fullText += token;
            self.postMessage({ type: 'token', id, token });
          },
        }
      );

      await (generator as (input: string, opts: unknown) => Promise<unknown>)(prompt, {
        max_new_tokens: 1024,
        do_sample: true,
        temperature: 0.7,
        streamer,
        // AbortSignal not yet supported in all transformers.js builds
      });

      abortControllers.delete(id);
      self.postMessage({ type: 'done', id, text: fullText });
    } catch (err) {
      abortControllers.delete(id);
      const msg = String(err);
      if (msg.includes('AbortError') || msg.includes('aborted')) {
        self.postMessage({ type: 'done', id, text: fullText });
      } else {
        self.postMessage({ type: 'error', id, message: msg });
      }
    }
    return;
  }

  if (type === 'abort' && id) {
    abortControllers.get(id)?.abort();
    abortControllers.delete(id);
    return;
  }
};
