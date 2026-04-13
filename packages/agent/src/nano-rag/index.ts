/**
 * VectorIndex — brute-force nearest-neighbor on quantized vectors.
 * For nano-RAG, the corpus is small (<1000 chunks per session),
 * so brute-force is optimal (no HNSW overhead).
 */

import type { Chunk } from './chunker.js';

export interface IndexEntry {
  chunk: Chunk;
  embedding: Float32Array; // original float32 (for asymmetric search)
  quantized?: Uint8Array; // TurboQuant quantized (when quantizer is loaded)
  addedAt: number;       // timestamp when added
  lastAccessed: number;  // timestamp when last retrieved
  accessCount: number;   // how many times retrieved
}

export interface SearchResult {
  chunk: Chunk;
  score: number; // cosine similarity (higher = more relevant)
}

export class VectorIndex {
  private entries: IndexEntry[] = [];

  /** Number of indexed chunks */
  get size(): number {
    return this.entries.length;
  }

  /** Add chunks with their embeddings to the index */
  add(chunks: Chunk[], embeddings: Float32Array[]): void {
    const now = Date.now();
    for (let i = 0; i < chunks.length; i++) {
      this.entries.push({
        chunk: chunks[i],
        embedding: embeddings[i],
        addedAt: now,
        lastAccessed: now,
        accessCount: 0,
      });
    }
  }

  /** Add quantized versions (call after quantizer is loaded) */
  setQuantized(index: number, quantized: Uint8Array): void {
    if (this.entries[index]) {
      this.entries[index].quantized = quantized;
    }
  }

  /**
   * Search for the top-K most similar chunks to a query embedding.
   * Uses cosine similarity (embeddings are L2-normalized).
   */
  search(queryEmbedding: Float32Array, topK: number = 3): SearchResult[] {
    if (this.entries.length === 0) return [];

    const scores: { index: number; score: number }[] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const score = dotProduct(queryEmbedding, this.entries[i].embedding);
      scores.push({ index: i, score });
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    // Update access tracking on returned results
    const now = Date.now();
    const results = scores.slice(0, topK);
    for (const s of results) {
      this.entries[s.index].lastAccessed = now;
      this.entries[s.index].accessCount++;
    }

    return results.map((s) => ({
      chunk: this.entries[s.index].chunk,
      score: s.score,
    }));
  }

  /** BM25 scoring for keyword-based retrieval */
  private bm25Search(queryText: string, topK: number): SearchResult[] {
    const queryTerms = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (queryTerms.length === 0) return [];

    const N = this.entries.length;
    // Document frequencies
    const df = new Map<string, number>();
    const docTerms = this.entries.map(e => {
      const terms = e.chunk.text.toLowerCase().split(/\s+/);
      const unique = new Set(terms);
      for (const t of unique) df.set(t, (df.get(t) ?? 0) + 1);
      return terms;
    });

    const k1 = 1.2, b = 0.75;
    const avgDl = docTerms.reduce((s, d) => s + d.length, 0) / N;

    const scores: { index: number; score: number }[] = [];
    for (let i = 0; i < N; i++) {
      let score = 0;
      const dl = docTerms[i].length;
      const termFreq = new Map<string, number>();
      for (const t of docTerms[i]) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);

      for (const q of queryTerms) {
        const tf = termFreq.get(q) ?? 0;
        const docFreq = df.get(q) ?? 0;
        if (tf === 0) continue;
        const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
        score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgDl));
      }
      if (score > 0) scores.push({ index: i, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK).map(s => ({
      chunk: this.entries[s.index].chunk,
      score: s.score,
    }));
  }

  /** Hybrid search: combine dense (cosine) + sparse (BM25) via Reciprocal Rank Fusion */
  searchHybrid(queryEmbedding: Float32Array, queryText: string, topK = 3): SearchResult[] {
    if (this.entries.length === 0) return [];

    const k = 60; // RRF constant
    const denseResults = this.search(queryEmbedding, topK * 2);
    const bm25Results = this.bm25Search(queryText, topK * 2);

    // RRF scoring
    const rrfScores = new Map<number, number>();

    for (let rank = 0; rank < denseResults.length; rank++) {
      const idx = this.entries.findIndex(e => e.chunk === denseResults[rank].chunk);
      rrfScores.set(idx, (rrfScores.get(idx) ?? 0) + 1 / (k + rank + 1));
    }
    for (let rank = 0; rank < bm25Results.length; rank++) {
      const idx = this.entries.findIndex(e => e.chunk === bm25Results[rank].chunk);
      rrfScores.set(idx, (rrfScores.get(idx) ?? 0) + 1 / (k + rank + 1));
    }

    const sorted = [...rrfScores.entries()].sort((a, b) => b[1] - a[1]);

    // Update access tracking on returned results
    const now = Date.now();
    const topResults = sorted.slice(0, topK);
    for (const [idx] of topResults) {
      this.entries[idx].lastAccessed = now;
      this.entries[idx].accessCount++;
    }

    return topResults.map(([idx, score]) => ({
      chunk: this.entries[idx].chunk,
      score,
    }));
  }

  /**
   * Search using quantized vectors (faster for large indices).
   * Falls back to float32 if quantized vectors aren't available.
   */
  searchQuantized(
    queryEmbedding: Float32Array,
    dotFn: (query: Float32Array, quantized: Uint8Array) => number,
    topK: number = 3,
  ): SearchResult[] {
    if (this.entries.length === 0) return [];

    const scores: { index: number; score: number }[] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const score = entry.quantized
        ? dotFn(queryEmbedding, entry.quantized)
        : dotProduct(queryEmbedding, entry.embedding);
      scores.push({ index: i, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK).map((s) => ({
      chunk: this.entries[s.index].chunk,
      score: s.score,
    }));
  }

  /** Evict stale entries — remove chunks not accessed within maxAge ms unless highly accessed */
  evictStale(now: number, maxAge: number, minAccess: number): void {
    this.entries = this.entries.filter(e =>
      (now - e.lastAccessed) < maxAge || e.accessCount > minAccess
    );
  }

  /** Clear the entire index */
  clear(): void {
    this.entries = [];
  }

  /** Remove entries from a specific tool call */
  removeByToolUseId(toolUseId: string): void {
    this.entries = this.entries.filter((e) => e.chunk.toolUseId !== toolUseId);
  }
}

/** Dot product of two Float32Arrays (cosine similarity for L2-normalized vecs) */
function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}
