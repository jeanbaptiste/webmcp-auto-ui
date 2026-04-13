/**
 * ContextRAG — nano-RAG for agent context compaction.
 *
 * Ingests tool_results, chunks them into atomic facts, embeds them,
 * and retrieves the most relevant chunks before each LLM call.
 *
 * Credits: TurboQuant (Zandieh et al.), GraphReader/Laconic (Steve Hanov),
 * Fabrice Bellard (minimal C philosophy).
 */

import { chunkToolResult, contextualizeChunk, type Chunk } from './chunker.js';
import { Embedder, EMBEDDING_DIMS } from './embedder.js';
import { VectorIndex, type SearchResult } from './index.js';

/** Deduplicate results with high text similarity (Jaccard on word sets) */
function deduplicateResults(results: SearchResult[], threshold = 0.7): SearchResult[] {
  const kept: SearchResult[] = [];
  for (const r of results) {
    const rWords = new Set(r.chunk.text.toLowerCase().split(/\s+/));
    const isDupe = kept.some(k => {
      const kWords = new Set(k.chunk.text.toLowerCase().split(/\s+/));
      const intersection = [...rWords].filter(w => kWords.has(w)).length;
      const union = new Set([...rWords, ...kWords]).size;
      return union > 0 && intersection / union > threshold;
    });
    if (!isDupe) kept.push(r);
  }
  return kept;
}

export interface ContextRAGOptions {
  /** Max chunks to retrieve per query (default: 5) */
  topK?: number;
  /** Max chunk size in chars (default: 300) */
  maxChunkSize?: number;
  /** Enable/disable (default: true when created) */
  enabled?: boolean;
  /** Progress callback for embedder model loading */
  onProgress?: (status: string, loaded?: number, total?: number) => void;
}

export class ContextRAG {
  private embedder: Embedder;
  private index = new VectorIndex();
  private topK: number;
  private maxChunkSize: number;
  private enabled: boolean;
  private ready = false;
  private initPromise: Promise<void> | null = null;

  constructor(opts?: ContextRAGOptions) {
    this.topK = opts?.topK ?? 5;
    this.maxChunkSize = opts?.maxChunkSize ?? 300;
    this.enabled = opts?.enabled ?? true;
    this.embedder = new Embedder({ onProgress: opts?.onProgress });
  }

  /** Initialize the embedder (downloads model on first use) */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.embedder.initialize().then(() => { this.ready = true; });
    return this.initPromise;
  }

  /** Is the RAG initialized and ready? */
  get isReady(): boolean { return this.ready; }

  /** Number of chunks in the index */
  get size(): number { return this.index.size; }

  /**
   * Ingest a tool_result — chunk it, embed it, index it.
   * Call this after each tool_result is received in the agent loop.
   * @param userQuery — optional user query for contextual embeddings (prefix chunks with tool+query context)
   */
  async ingest(toolName: string, toolUseId: string, result: string, userQuery?: string): Promise<number> {
    if (!this.enabled) return 0;
    if (!this.ready) await this.initialize();

    const chunks = chunkToolResult(toolName, toolUseId, result, this.maxChunkSize);
    if (chunks.length === 0) return 0;

    // Contextual embeddings: prefix chunks with tool name + user query for better retrieval
    const textsToEmbed = chunks.map(c => contextualizeChunk(c, toolName, userQuery));
    const embeddings = await this.embedder.embedBatch(textsToEmbed);
    this.index.add(chunks, embeddings);

    return chunks.length;
  }

  /**
   * Query the index — returns the top-K most relevant chunks for a given text.
   * Uses hybrid search (dense cosine + BM25 with Reciprocal Rank Fusion).
   * Call this before each LLM call to inject relevant context.
   */
  async query(text: string, topK?: number): Promise<SearchResult[]> {
    if (!this.enabled || this.index.size === 0) return [];
    if (!this.ready) await this.initialize();

    const queryEmbedding = await this.embedder.embed(text);
    return this.index.searchHybrid(queryEmbedding, text, topK ?? this.topK);
  }

  /**
   * Build a context summary string from query results.
   * This is what gets injected into the system prompt.
   * @param minScore — minimum score threshold for selective augmentation (default: 0.35)
   */
  async buildContext(userMessage: string, topK?: number, minScore = 0.35): Promise<string> {
    const results = (await this.query(userMessage, topK))
      .filter(r => r.score >= minScore);
    if (results.length === 0) return '';

    const filtered = deduplicateResults(results);

    const lines = filtered.map((r, i) =>
      `[${i + 1}] (score: ${r.score.toFixed(2)}, source: ${r.chunk.source}) ${r.chunk.text}`
    );

    return `--- Contexte pertinent (nano-RAG) ---\n${lines.join('\n')}\n--- Fin contexte ---`;
  }

  /** Remove all chunks from a specific tool call */
  evict(toolUseId: string): void {
    this.index.removeByToolUseId(toolUseId);
  }

  /** Evict stale chunks not accessed within maxAge ms (default: 5min) */
  evictStale(maxAge: number = 300000, minAccess: number = 0): number {
    const now = Date.now();
    const before = this.index.size;
    this.index.evictStale(now, maxAge, minAccess);
    return before - this.index.size;
  }

  /** Clear the entire index */
  clear(): void {
    this.index.clear();
  }

  /** Destroy the embedder and free resources */
  destroy(): void {
    this.embedder.destroy();
    this.index.clear();
    this.ready = false;
    this.initPromise = null;
  }
}
