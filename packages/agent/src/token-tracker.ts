/**
 * TokenTracker — accumulates LLM usage metrics with rolling-window rates.
 * Subscribe to get real-time updates after each LLM response.
 */

export interface TokenMetrics {
  // Cumulative
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;

  // Per-minute rates (rolling 60s window)
  requestsPerMin: number;
  inputTokensPerMin: number;
  outputTokensPerMin: number;

  // Last request
  lastInputTokens: number;
  lastOutputTokens: number;
  lastCacheReadTokens: number;
  lastLatencyMs: number;

  // Derived
  totalCachedGB: number;  // totalCacheReadTokens converted to GB (tokens × 4 / 1e9)
  isWasm: boolean;        // true if last metrics came from recordEstimate (WASM)
}

function emptyMetrics(): TokenMetrics {
  return {
    totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCacheReadTokens: 0,
    requestsPerMin: 0, inputTokensPerMin: 0, outputTokensPerMin: 0,
    lastInputTokens: 0, lastOutputTokens: 0, lastCacheReadTokens: 0, lastLatencyMs: 0,
    totalCachedGB: 0, isWasm: false,
  };
}

interface TokenEvent {
  ts: number;
  input: number;
  output: number;
  cacheRead: number;
}

export class TokenTracker {
  private events: TokenEvent[] = [];
  private _metrics: TokenMetrics = emptyMetrics();
  private listeners = new Set<(m: TokenMetrics) => void>();

  /** Called after each LLM response with raw usage stats. */
  record(
    usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number },
    latencyMs?: number,
    isWasm = false,
  ): void {
    const now = Date.now();
    const event: TokenEvent = {
      ts: now,
      input: usage.input_tokens,
      output: usage.output_tokens,
      cacheRead: usage.cache_read_input_tokens ?? 0,
    };
    this.events.push(event);

    // Cumulative
    this._metrics.totalRequests++;
    this._metrics.totalInputTokens += event.input;
    this._metrics.totalOutputTokens += event.output;
    this._metrics.totalCacheReadTokens += event.cacheRead;
    this._metrics.lastInputTokens = event.input;
    this._metrics.lastOutputTokens = event.output;
    this._metrics.lastCacheReadTokens = event.cacheRead;
    this._metrics.lastLatencyMs = latencyMs ?? 0;
    this._metrics.totalCachedGB = this._metrics.totalCacheReadTokens * 4 / 1e9;
    this._metrics.isWasm = isWasm;

    // Rolling per-minute rates
    const oneMinAgo = now - 60_000;
    const recent = this.events.filter(e => e.ts > oneMinAgo);
    this._metrics.requestsPerMin = recent.length;
    this._metrics.inputTokensPerMin = recent.reduce((s, e) => s + e.input, 0);
    this._metrics.outputTokensPerMin = recent.reduce((s, e) => s + e.output, 0);

    // Trim old events (keep last 5 min)
    const fiveMinAgo = now - 300_000;
    this.events = this.events.filter(e => e.ts > fiveMinAgo);

    this.notify();
  }

  /** For WASM models (no usage stats) — estimate tokens from char counts. */
  recordEstimate(promptChars: number, outputChars: number, latencyMs?: number): void {
    this.record({
      input_tokens: Math.ceil(promptChars / 4),
      output_tokens: Math.ceil(outputChars / 4),
    }, latencyMs);
    this._metrics.isWasm = true;
    this.notify();
  }

  get metrics(): TokenMetrics {
    return { ...this._metrics };
  }

  subscribe(fn: (m: TokenMetrics) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  reset(): void {
    this.events = [];
    this._metrics = emptyMetrics();
    this.notify();
  }

  private notify(): void {
    const snapshot = { ...this._metrics };
    this.listeners.forEach(fn => fn(snapshot));
  }
}
