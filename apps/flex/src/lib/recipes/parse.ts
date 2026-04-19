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
  // Non-greedy body; allow any chars between the fences.
  const re = /```([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(body)) !== null) {
    const [full, langRaw, codeRaw] = match;
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
