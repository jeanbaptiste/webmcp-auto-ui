// @webmcp-auto-ui/agent — nano-rag chunker
// Splits tool_results into atomic chunks suitable for embedding.
// Inspired by GraphReader's AtomicFacts: one chunk ≈ one fact.

const MAX_CHUNKS = 50;
const DEFAULT_MAX_CHUNK_SIZE = 300;

export interface Chunk {
  text: string;        // the atomic fact text
  source: string;      // tool name that produced this
  toolUseId: string;   // tool_use_id for recall reference
  index: number;       // chunk index within the tool_result
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Strip markdown links [text](url) → text */
function stripMarkdownLinks(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/** Strip HTML tags */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/** Clean a raw text fragment before it becomes a chunk */
function clean(s: string): string {
  return stripHtml(stripMarkdownLinks(s)).trim();
}

/** Truncate to maxChunkSize without splitting mid-word when possible */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(' ', max);
  return (cut > max * 0.5 ? s.slice(0, cut) : s.slice(0, max)) + '…';
}

/** Split text into sentences (period/exclamation/question followed by whitespace, or double-newline) */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace, or on double newlines
  return text.split(/(?<=[.!?])\s+|\n\n+/).filter(s => s.trim().length > 0);
}

/** Merge short sentences until they approach maxChunkSize */
function mergeSentences(sentences: string[], max: number): string[] {
  const merged: string[] = [];
  let buffer = '';
  for (const s of sentences) {
    if (buffer.length === 0) {
      buffer = s;
    } else if (buffer.length + 1 + s.length <= max) {
      buffer += ' ' + s;
    } else {
      merged.push(buffer);
      buffer = s;
    }
  }
  if (buffer.length > 0) merged.push(buffer);
  return merged;
}

// ── Strategy detection ──────────────────────────────────────────────

function tryParseJson(s: string): unknown | undefined {
  try {
    const parsed = JSON.parse(s);
    if (parsed !== null && typeof parsed === 'object') return parsed;
  } catch { /* not JSON */ }
  return undefined;
}

function hasMarkdownHeaders(s: string): boolean {
  return /^#{1,6}\s+/m.test(s);
}

// ── Chunking strategies ─────────────────────────────────────────────

function chunkJson(parsed: unknown, max: number): string[] {
  // Array of objects → each object = 1 chunk
  if (Array.isArray(parsed)) {
    return parsed.map(item => truncate(
      typeof item === 'string' ? item : JSON.stringify(item),
      max,
    ));
  }

  const obj = parsed as Record<string, unknown>;
  const keys = Object.keys(obj);

  // Object with string values → "key: value" per entry
  const allStringValues = keys.every(k => typeof obj[k] === 'string');
  if (allStringValues) {
    return keys.map(k => truncate(`${k}: ${obj[k] as string}`, max));
  }

  // Object with nested values → each top-level key = 1 chunk
  return keys.map(k => truncate(`${k}: ${JSON.stringify(obj[k])}`, max));
}

function chunkMarkdown(text: string, max: number): string[] {
  const sections = text.split(/^(?=#{1,6}\s+)/m).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  for (const section of sections) {
    const cleaned = clean(section);
    if (cleaned.length === 0) continue;
    if (cleaned.length <= max) {
      chunks.push(cleaned);
    } else {
      // Sub-split by sentences
      const sentences = splitSentences(cleaned);
      chunks.push(...mergeSentences(sentences, max).map(s => truncate(s, max)));
    }
  }
  return chunks;
}

function chunkPlainText(text: string, max: number): string[] {
  const cleaned = clean(text);
  if (cleaned.length <= max) return cleaned.length > 0 ? [cleaned] : [];
  const sentences = splitSentences(cleaned);
  return mergeSentences(sentences, max).map(s => truncate(s, max));
}

// ── Main entry point ────────────────────────────────────────────────

export function chunkToolResult(
  toolName: string,
  toolUseId: string,
  result: string,
  maxChunkSize: number = DEFAULT_MAX_CHUNK_SIZE,
): Chunk[] {
  // Edge case: empty / whitespace
  if (!result || result.trim().length === 0) return [];

  let rawChunks: string[];

  // Strategy 1: JSON structured data
  const parsed = tryParseJson(result.trim());
  if (parsed !== undefined) {
    rawChunks = chunkJson(parsed, maxChunkSize);
  }
  // Strategy 2: Markdown with headers
  else if (hasMarkdownHeaders(result)) {
    rawChunks = chunkMarkdown(result, maxChunkSize);
  }
  // Strategy 3 & 4: Plain text (long or short)
  else {
    rawChunks = chunkPlainText(result, maxChunkSize);
  }

  // Final assembly: trim, drop empties, cap at MAX_CHUNKS
  return rawChunks
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .slice(0, MAX_CHUNKS)
    .map((text, index) => ({ text, source: toolName, toolUseId, index }));
}
