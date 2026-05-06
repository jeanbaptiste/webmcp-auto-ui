import type { ParsedSegment } from './types.js';

/**
 * Split a markdown body into alternating markdown / code-block segments.
 * Fenced code blocks of the form:
 *
 *   ```lang
 *   code
 *   ```
 *
 * are extracted as `{ type: 'code', content, lang }`. Everything else stays as
 * `{ type: 'markdown', content }` so it can be rendered via MarkdownView.
 */
export function parseBody(body: string): ParsedSegment[] {
  if (!body) return [];

  const segments: ParsedSegment[] = [];
  // Match fenced code blocks with optional language tag.
  // Variable-length fence (≥3 backticks, CommonMark §4.5): the closing fence
  // must use the same number of backticks as the opening — captured via \1.
  // This allows cells whose content embeds ``` (e.g. widget('text', { content: "...```js..." }))
  // to be encoded with a longer fence (4+ backticks) without premature closure.
  const re = /(`{3,})([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)\r?\n\1[ \t]*(?=\r?\n|$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(body)) !== null) {
    const [full, , langRaw, codeRaw] = match;
    const start = match.index;

    if (start > lastIndex) {
      const chunk = body.slice(lastIndex, start);
      if (chunk.trim().length > 0) {
        segments.push({ type: 'markdown', content: chunk });
      }
    }

    segments.push({
      type: 'code',
      content: codeRaw.replace(/\r?\n$/, ''),
      lang: (langRaw || '').trim().toLowerCase() || 'text',
    });

    lastIndex = start + full.length;
  }

  if (lastIndex < body.length) {
    const tail = body.slice(lastIndex);
    if (tail.trim().length > 0) {
      segments.push({ type: 'markdown', content: tail });
    }
  }

  return segments;
}
