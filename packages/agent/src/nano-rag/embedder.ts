/**
 * Embedder — generates text embeddings using all-MiniLM-L6-v2 via onnxruntime-web.
 * The model produces 384-dimensional float32 vectors.
 *
 * Model is downloaded from HuggingFace and cached in OPFS (same pattern as Gemma WASM).
 *
 * Tokenization: requires @huggingface/transformers AutoTokenizer —
 * throws if unavailable (no fallback, hash tokenizers produce invalid embeddings).
 */

import type * as OrtTypes from 'onnxruntime-web';

export const EMBEDDING_DIMS = 384;

export interface EmbedderOptions {
  onProgress?: (status: string, loaded?: number, total?: number) => void;
}

// HF tokenizer instance (opaque — we only need encode())
type HFTokenizer = {
  (text: string, opts: Record<string, unknown>): {
    input_ids: { data: ArrayLike<number | bigint> };
    attention_mask: { data: ArrayLike<number | bigint> };
  };
  encode: (text: string, opts: Record<string, unknown>) => Promise<{
    input_ids?: ArrayLike<number | bigint>;
    attention_mask?: ArrayLike<number | bigint>;
    [key: string]: unknown;
  }>;
};

export class Embedder {
  private session: OrtTypes.InferenceSession | null = null;
  private tokenizer: HFTokenizer | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private opts?: EmbedderOptions) {}

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    const ort = await import('onnxruntime-web');

    // Use WASM backend, load WASM binaries from CDN (avoids bundling 70MB in builds)
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';

    const modelUrl =
      'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx';
    const modelSize = 23_000_000; // ~23MB quantized

    this.opts?.onProgress?.('downloading model', 0, modelSize);

    // Try OPFS cache first
    let modelBuffer: ArrayBuffer;
    try {
      modelBuffer = await this.loadFromOPFS('minilm-l6-v2.onnx', modelUrl, modelSize);
    } catch {
      // Fallback: direct fetch
      const resp = await fetch(modelUrl);
      modelBuffer = await resp.arrayBuffer();
    }

    this.opts?.onProgress?.('loading model', modelSize, modelSize);
    this.session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
    });

    // Require @huggingface/transformers for proper WordPiece tokenization
    try {
      const { AutoTokenizer } = await import('@huggingface/transformers');
      this.tokenizer = await AutoTokenizer.from_pretrained('Xenova/all-MiniLM-L6-v2') as unknown as HFTokenizer;
    } catch {
      throw new Error(
        '[nano-rag] @huggingface/transformers is required for valid embeddings. ' +
        'Install it or disable nano-RAG.'
      );
    }

    this.opts?.onProgress?.('ready', modelSize, modelSize);
  }

  /**
   * Embed a single text string → Float32Array[384]
   */
  async embed(text: string): Promise<Float32Array> {
    if (!this.session) await this.initialize();
    const ort = await import('onnxruntime-web');

    const maxLen = 128;

    // Tokenize using HF AutoTokenizer
    const encoded = this.tokenizer!(text, {
      padding: true,
      truncation: true,
      max_length: maxLen,
    });
    const rawIds = encoded.input_ids.data;
    const rawMask = encoded.attention_mask.data;
    const seqLen = rawIds.length;

    // Create input tensors
    const inputIds = new ort.Tensor(
      'int64',
      BigInt64Array.from(Array.from(rawIds, v => BigInt(Number(v)))),
      [1, seqLen],
    );
    const attentionMask = new ort.Tensor(
      'int64',
      BigInt64Array.from(Array.from(rawMask, v => BigInt(Number(v)))),
      [1, seqLen],
    );
    const tokenTypeIds = new ort.Tensor(
      'int64',
      new BigInt64Array(seqLen),
      [1, seqLen],
    );

    // Run inference
    const output = await this.session!.run({
      input_ids: inputIds,
      attention_mask: attentionMask,
      token_type_ids: tokenTypeIds,
    });

    // Mean pooling over token embeddings (masked)
    const lastHidden = output['last_hidden_state'] ?? output[Object.keys(output)[0]];
    const data = lastHidden.data as Float32Array;
    const dims = EMBEDDING_DIMS;

    const pooled = new Float32Array(dims);
    let count = 0;
    for (let t = 0; t < seqLen; t++) {
      if (Number(rawMask[t]) === 1) {
        for (let d = 0; d < dims; d++) {
          pooled[d] += data[t * dims + d];
        }
        count++;
      }
    }
    if (count > 0) {
      for (let d = 0; d < dims; d++) pooled[d] /= count;
    }

    // L2 normalize
    let norm = 0;
    for (let d = 0; d < dims; d++) norm += pooled[d] * pooled[d];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let d = 0; d < dims; d++) pooled[d] /= norm;
    }

    return pooled;
  }

  /**
   * Embed multiple texts — real ONNX batching with padding.
   * Falls back to sequential for single text.
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.session) await this.initialize();
    if (texts.length === 0) return [];
    if (texts.length === 1) return [await this.embed(texts[0])];

    const ort = await import('onnxruntime-web');
    const maxLen = 128;

    // Tokenize all texts
    const allEncoded = texts.map(t => this.tokenizer!(t, {
      padding: true,
      truncation: true,
      max_length: maxLen,
    }));

    // Build batch tensors
    const batchSize = texts.length;
    const inputIds = new BigInt64Array(batchSize * maxLen);
    const attentionMask = new BigInt64Array(batchSize * maxLen);
    const tokenTypeIds = new BigInt64Array(batchSize * maxLen);

    for (let b = 0; b < batchSize; b++) {
      const ids = allEncoded[b].input_ids.data;
      const mask = allEncoded[b].attention_mask.data;
      for (let t = 0; t < maxLen; t++) {
        inputIds[b * maxLen + t] = BigInt(Number(ids[t] ?? 0));
        attentionMask[b * maxLen + t] = BigInt(Number(mask[t] ?? (t < ids.length ? 1 : 0)));
      }
    }

    const output = await this.session!.run({
      input_ids: new ort.Tensor('int64', inputIds, [batchSize, maxLen]),
      attention_mask: new ort.Tensor('int64', attentionMask, [batchSize, maxLen]),
      token_type_ids: new ort.Tensor('int64', tokenTypeIds, [batchSize, maxLen]),
    });

    const lastHidden = output['last_hidden_state'] ?? output[Object.keys(output)[0]];
    const data = lastHidden.data as Float32Array;
    const dims = EMBEDDING_DIMS;

    // Extract per-text embeddings with mean pooling + L2 norm
    const results: Float32Array[] = [];
    for (let b = 0; b < batchSize; b++) {
      const pooled = new Float32Array(dims);
      let count = 0;
      for (let t = 0; t < maxLen; t++) {
        if (attentionMask[b * maxLen + t] === 1n) {
          for (let d = 0; d < dims; d++) {
            pooled[d] += data[(b * maxLen + t) * dims + d];
          }
          count++;
        }
      }
      if (count > 0) for (let d = 0; d < dims; d++) pooled[d] /= count;
      // L2 normalize
      let norm = 0;
      for (let d = 0; d < dims; d++) norm += pooled[d] * pooled[d];
      norm = Math.sqrt(norm);
      if (norm > 0) for (let d = 0; d < dims; d++) pooled[d] /= norm;
      results.push(pooled);
    }

    return results;
  }

  private async loadFromOPFS(
    filename: string,
    url: string,
    expectedSize: number,
  ): Promise<ArrayBuffer> {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('webmcp-embeddings', { create: true });

    // Check cache
    try {
      const handle = await dir.getFileHandle(filename);
      const file = await handle.getFile();
      if (file.size > 1000 && Math.abs(file.size - expectedSize) < expectedSize * 0.1) {
        this.opts?.onProgress?.('cached', file.size, file.size);
        return await file.arrayBuffer();
      }
    } catch {
      /* cache miss */
    }

    // Download with progress
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const buffer = await resp.arrayBuffer();

    // Cache to OPFS (fire and forget)
    try {
      const handle = await dir.getFileHandle(filename, { create: true });
      const writable = await handle.createWritable();
      await writable.write(buffer);
      await writable.close();
    } catch {
      /* cache write failure is non-fatal */
    }

    return buffer;
  }

  destroy(): void {
    this.session?.release?.();
    this.session = null;
    this.initPromise = null;
  }
}

