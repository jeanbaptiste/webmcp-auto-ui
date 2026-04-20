// Unified tool-call parser for in-browser providers.
// Each family of models emits tool calls in a different syntax:
//   - Gemma 4 native      → <|tool_call>call:name{args}<tool_call|>
//   - Qwen 3/3.5 (ChatML) → <tool_call>{"name": ..., "arguments": {...}}</tool_call>
//   - Mistral/Ministral   → [TOOL_CALLS][{"name": ..., "arguments": {...}}]
//
// Each parser returns a list of ContentBlocks — tool_use blocks for detected
// calls, plus a single text block with the remaining prose (tool-call tags
// stripped, thinking tags stripped for Qwen).

import type { ContentBlock } from '../types.js';

export type ToolCallFormat = 'gemma-native' | 'qwen-json' | 'mistral-toolcalls';

export interface ParseResult {
  content: ContentBlock[];
  foundToolCall: boolean;
}

export function parseToolCalls(text: string, format: ToolCallFormat): ParseResult {
  switch (format) {
    case 'gemma-native': return parseGemmaNative(text);
    case 'qwen-json': return parseQwenJson(text);
    case 'mistral-toolcalls': return parseMistralToolCalls(text);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Gemma 4 native — single source of truth (previously also in wasm.ts).
// Exported so that WasmProvider can import and reuse instead of duplicating.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Extract a brace-balanced `{...}` block starting at `text[startIdx]`.
 * Ignores `{` and `}` that appear inside `<|"|>...<|"|>` string delimiters
 * or inside standard JSON `"..."` strings.
 * Returns the full block including outer braces, or null if unbalanced.
 */
export function extractArgsBlock(text: string, startIdx: number): string | null {
  if (text[startIdx] !== '{') return null;
  const DELIM = '<|"|>';
  let depth = 0;
  let i = startIdx;
  while (i < text.length) {
    if (text.startsWith(DELIM, i)) {
      i += DELIM.length;
      const end = text.indexOf(DELIM, i);
      if (end === -1) return null;
      i = end + DELIM.length;
      continue;
    }
    if (text[i] === '"') {
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < text.length) { i += 2; continue; }
        i++;
      }
      i++;
      continue;
    }
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
    i++;
  }
  return null;
}

/**
 * Skip "noise" chars that Gemma sometimes hallucinates between the end of a
 * balanced args block and the `<tool_call|>` closing tag. Observed in prod:
 * excess `}` braces, trailing commas, whitespace. Without this tolerance the
 * strict scanner rejects the whole tool call silently (no tool_use produced),
 * which breaks widget rendering.
 */
function skipNoise(text: string, pos: number): number {
  while (pos < text.length) {
    const c = text[pos];
    if (c === '}' || c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === ',') {
      pos++;
      continue;
    }
    break;
  }
  return pos;
}

/**
 * Scan `fullText` for Gemma native tool calls and return the list of
 * `{ name, argsBlock }` pairs found. Tolerates hallucinated noise
 * (excess `}`, whitespace, trailing commas) between the balanced args
 * block and the `<tool_call|>` closing tag.
 */
export function extractGemmaToolCalls(fullText: string): Array<{ name: string; argsBlock: string }> {
  const START_TAG = '<|tool_call>call:';
  const END_TAG = '<tool_call|>';
  const out: Array<{ name: string; argsBlock: string }> = [];
  let scanIdx = 0;
  while (true) {
    const startIdx = fullText.indexOf(START_TAG, scanIdx);
    if (startIdx === -1) break;
    const nameStart = startIdx + START_TAG.length;
    const braceIdx = fullText.indexOf('{', nameStart);
    if (braceIdx === -1) break;
    const name = fullText.slice(nameStart, braceIdx);
    if (!/^\w+$/.test(name)) { scanIdx = nameStart; continue; }
    const argsBlock = extractArgsBlock(fullText, braceIdx);
    if (!argsBlock) break;
    const afterArgsRaw = braceIdx + argsBlock.length;
    const afterArgs = skipNoise(fullText, afterArgsRaw);
    if (!fullText.startsWith(END_TAG, afterArgs)) { scanIdx = afterArgsRaw; continue; }
    out.push({ name, argsBlock });
    scanIdx = afterArgs + END_TAG.length;
  }
  return out;
}

/**
 * Parse Gemma native tool call args by normalizing to strict JSON.
 * Handles both `<|"|>...<|"|>` (Gemma native) and `"..."` (JSON-style, emitted
 * when the model copies JS-syntax examples from recipe bodies). Raw newlines
 * inside JSON strings are escaped. Unquoted keys are quoted.
 */
export function parseGemmaArgs(raw: string): Record<string, unknown> {
  const DELIM = '<|"|>';
  let out = '';
  let i = 0;
  while (i < raw.length) {
    if (raw.startsWith(DELIM, i)) {
      i += DELIM.length;
      const end = raw.indexOf(DELIM, i);
      if (end === -1) return {};
      // Decode standard backslash escapes inside <|"|>…<|"|> strings so that
      // a recipe-copied `\n` becomes a real newline, not the two-char
      // sequence `\n` that would then be re-escaped to `\\n` by
      // JSON.stringify and reach the sandbox as literal text. Other
      // backslash-x sequences are preserved verbatim (single backslash kept).
      const body = raw.slice(i, end);
      let decoded = '';
      for (let k = 0; k < body.length; k++) {
        const ch = body[k];
        if (ch === '\\' && k + 1 < body.length) {
          const nxt = body[k + 1];
          if (nxt === 'n') { decoded += '\n'; k++; continue; }
          if (nxt === 't') { decoded += '\t'; k++; continue; }
          if (nxt === 'r') { decoded += '\r'; k++; continue; }
          if (nxt === '"') { decoded += '"'; k++; continue; }
          if (nxt === '\\') { decoded += '\\'; k++; continue; }
          // Unknown escape — keep the backslash verbatim
          decoded += ch;
          continue;
        }
        decoded += ch;
      }
      out += JSON.stringify(decoded);
      i = end + DELIM.length;
      continue;
    }
    const c = raw[i];
    if (c === '"') {
      let content = '';
      i++;
      while (i < raw.length && raw[i] !== '"') {
        const ch = raw[i];
        if (ch === '\\' && i + 1 < raw.length) { content += ch + raw[i + 1]; i += 2; continue; }
        if (ch === '\n') content += '\\n';
        else if (ch === '\r') content += '\\r';
        else if (ch === '\t') content += '\\t';
        else content += ch;
        i++;
      }
      if (i >= raw.length) return {};
      out += '"' + content + '"';
      i++;
      continue;
    }
    if (c === '{' || c === ',') {
      out += c;
      i++;
      while (i < raw.length && /\s/.test(raw[i])) { out += raw[i++]; }
      const keyStart = i;
      while (i < raw.length && /[a-zA-Z0-9_$]/.test(raw[i])) i++;
      if (i > keyStart) {
        let j = i;
        while (j < raw.length && /\s/.test(raw[j])) j++;
        if (raw[j] === ':') out += '"' + raw.slice(keyStart, i) + '"';
        else out += raw.slice(keyStart, i);
      }
      continue;
    }
    out += c;
    i++;
  }
  try {
    const parsed = JSON.parse(out);
    return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

function parseGemmaNative(text: string): ParseResult {
  const calls = extractGemmaToolCalls(text);  // uses the exported helper above
  const content: ContentBlock[] = [];
  for (let idx = 0; idx < calls.length; idx++) {
    const c = calls[idx];
    content.push({
      type: 'tool_use',
      id: `tc-${Date.now()}-${idx}`,
      name: c.name,
      input: parseGemmaArgs(c.argsBlock),
    });
  }
  if (calls.length === 0) {
    const cleanText = text.replace(/<\|tool_call>[\s\S]*?<tool_call\|>/g, '').trim();
    content.push({ type: 'text', text: cleanText || text });
    return { content, foundToolCall: false };
  }
  // Preserve any prose around the tool calls (strip the call blocks).
  const prose = text.replace(/<\|tool_call>[\s\S]*?<tool_call\|>/g, '').trim();
  if (prose) {
    content.unshift({ type: 'text', text: prose });
  }
  return { content, foundToolCall: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Qwen 3/3.5 ChatML tool-call format
// ──────────────────────────────────────────────────────────────────────────

function parseQwenJson(text: string): ParseResult {
  // Strip <think>...</think> thinking tokens from prose (they shouldn't leak).
  const noThink = text.replace(/<think>[\s\S]*?<\/think>/g, '');

  const re = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
  const content: ContentBlock[] = [];
  const matches: Array<{ name: string; input: Record<string, unknown> }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(noThink)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj && typeof obj === 'object' && typeof obj.name === 'string') {
        matches.push({
          name: obj.name,
          input: (obj.arguments ?? {}) as Record<string, unknown>,
        });
      }
    } catch {
      // Skip unparseable tool_call blocks.
    }
  }

  const prose = noThink.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();

  if (matches.length === 0) {
    content.push({ type: 'text', text: prose || noThink.trim() });
    return { content, foundToolCall: false };
  }

  if (prose) {
    content.push({ type: 'text', text: prose });
  }
  for (let i = 0; i < matches.length; i++) {
    content.push({
      type: 'tool_use',
      id: `tc-${Date.now()}-${i}`,
      name: matches[i].name,
      input: matches[i].input,
    });
  }
  return { content, foundToolCall: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Mistral [TOOL_CALLS][...] format
// ──────────────────────────────────────────────────────────────────────────

function parseMistralToolCalls(text: string): ParseResult {
  const re = /\[TOOL_CALLS\]\s*(\[[\s\S]*?\])/g;
  const content: ContentBlock[] = [];
  const matches: Array<{ name: string; input: Record<string, unknown> }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    try {
      const arr = JSON.parse(m[1]);
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          if (entry && typeof entry === 'object' && typeof entry.name === 'string') {
            matches.push({
              name: entry.name,
              input: (entry.arguments ?? {}) as Record<string, unknown>,
            });
          }
        }
      }
    } catch {
      // Skip unparseable [TOOL_CALLS] blocks.
    }
  }

  const prose = text.replace(/\[TOOL_CALLS\]\s*\[[\s\S]*?\]/g, '').trim();

  if (matches.length === 0) {
    content.push({ type: 'text', text: prose || text.trim() });
    return { content, foundToolCall: false };
  }

  if (prose) {
    content.push({ type: 'text', text: prose });
  }
  for (let i = 0; i < matches.length; i++) {
    content.push({
      type: 'tool_use',
      id: `tc-${Date.now()}-${i}`,
      name: matches[i].name,
      input: matches[i].input,
    });
  }
  return { content, foundToolCall: true };
}
