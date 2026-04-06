// @ts-nocheck
import { pipeline, TextStreamer } from '@huggingface/transformers';
let generator: any = null;
self.onmessage = async (e: MessageEvent) => {
  const { type, id, prompt, model } = e.data;
  if (type === 'init') {
    try {
      const modelId = model ?? 'onnx-community/gemma-4-E2B-it-ONNX-GQA';
      const device = (navigator as any).gpu ? 'webgpu' : 'wasm';
      generator = await pipeline('text-generation', modelId, {
        dtype: 'q4', device,
        progress_callback: (p: any) => self.postMessage({ type: 'progress', ...p }),
      });
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', message: err.message ?? String(err) });
    }
  } else if (type === 'chat') {
    if (!generator) { self.postMessage({ type: 'error', id, message: 'Model not loaded' }); return; }
    try {
      const streamer = new TextStreamer(generator.tokenizer, { skip_prompt: true, callback_function: (token: string) => self.postMessage({ type: 'token', id, token }) });
      const out = await generator(prompt, { max_new_tokens: 1024, temperature: 0.7, do_sample: true, streamer });
      self.postMessage({ type: 'done', id, text: out[0].generated_text });
    } catch (err: any) {
      self.postMessage({ type: 'error', id, message: err.message ?? String(err) });
    }
  }
};
