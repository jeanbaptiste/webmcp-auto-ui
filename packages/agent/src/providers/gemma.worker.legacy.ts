/**
 * Gemma 4 Web Worker
 * Uses @huggingface/transformers v3+ with WebGPU
 * Requires COOP/COEP headers for SharedArrayBuffer
 *
 * Messages IN:  { type: 'init', model?: string }
 *               { type: 'chat', id: string, prompt: string, maxTokens?: number }
 *               { type: 'abort', id: string }
 * Messages OUT: { type: 'progress', progress: number, status: string }
 *               { type: 'ready' }
 *               { type: 'token', id: string, token: string }
 *               { type: 'done', id: string, text: string }
 *               { type: 'error', id: string | null, message: string }
 */

import { AutoProcessor, Gemma4ForConditionalGeneration, TextStreamer, env } from '@huggingface/transformers';

env.allowLocalModels = false;

const WASM_MODEL_REGISTRY: Record<string, { repo: string; dtype: string }> = {
  'gemma-e2b': { repo: 'onnx-community/gemma-4-E2B-it-ONNX', dtype: 'q4f16' },
  'gemma-e4b': { repo: 'onnx-community/gemma-4-E4B-it-ONNX', dtype: 'q4f16' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let model: any = null;
const abortControllers = new Map<string, AbortController>();

self.onmessage = async (e: MessageEvent) => {
  const { type, id, model: modelId, prompt } = e.data as {
    type: string; id?: string; model?: string; prompt?: string;
  };

  if (type === 'init') {
    try {
      const key = modelId ?? 'gemma-e2b';
      const { repo, dtype } = WASM_MODEL_REGISTRY[key] ?? WASM_MODEL_REGISTRY['gemma-e2b'];
      const device = typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm';

      const progress_callback = (p: { status: string; progress?: number; loaded?: number; total?: number; name?: string }) => {
        self.postMessage({
          type: 'progress',
          progress: p.progress ?? 0,
          status: p.status,
          name: p.name ?? '',
          loaded: p.loaded,
          total: p.total,
        });
      };

      processor = await AutoProcessor.from_pretrained(repo, { progress_callback });
      model = await Gemma4ForConditionalGeneration.from_pretrained(repo, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dtype: dtype as any,
        device,
        progress_callback,
      });

      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', id: null, message: String(err) });
    }
    return;
  }

  const maxTokens = (e.data as { maxTokens?: number }).maxTokens;

  if (type === 'chat' && id && prompt) {
    if (!model || !processor) {
      self.postMessage({ type: 'error', id, message: 'Model not initialized' });
      return;
    }

    const ac = new AbortController();
    abortControllers.set(id, ac);
    let fullText = '';

    try {
      const conversation = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
      const inputs = await processor.apply_chat_template(conversation, {
        tokenize: true,
        add_generation_prompt: true,
        return_dict: true,
      });

      const streamer = new TextStreamer(processor.tokenizer, {
        skip_prompt: true,
        callback_function: (token: string) => {
          fullText += token;
          self.postMessage({ type: 'token', id, token });
        },
      });

      await model.generate({
        ...inputs,
        max_new_tokens: maxTokens ?? 8192,
        do_sample: true,
        temperature: 0.7,
        streamer,
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
