/**
 * PipelineTrace — lightweight tracing for the tool pipeline.
 * Accumulates what happens at each step (sanitize, flatten, validate, repair, parse, dispatch).
 * When everything is fine → nothing logged. When a step degrades data → warning visible in agent console.
 */

export interface TraceEntry {
  step: string;          // "sanitize", "flatten", "validate", "repair", "parse", "dispatch"
  tool: string;          // tool name
  detail: string;        // human-readable description
  level: 'ok' | 'warn' | 'error';
}

export class PipelineTrace {
  entries: TraceEntry[] = [];

  push(step: string, tool: string, detail: string, level: 'ok' | 'warn' | 'error' = 'ok') {
    this.entries.push({ step, tool, detail, level });
  }

  get warnings() { return this.entries.filter(e => e.level !== 'ok'); }

  hasErrors() { return this.entries.some(e => e.level === 'error'); }

  summary(): string {
    const w = this.warnings;
    if (w.length === 0) return '';
    return w.map(e => `[${e.step}] ${e.tool}: ${e.detail}`).join('\n');
  }

  clear() { this.entries.length = 0; }
}
