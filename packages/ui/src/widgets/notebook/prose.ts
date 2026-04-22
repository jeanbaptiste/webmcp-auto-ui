// @ts-nocheck
// ---------------------------------------------------------------------------
// Lightweight markdown renderer + allowlist sanitizer for notebook prose cells.
// Also: renderMarkdownWithInjectButtons — used by recipe viewer modal.
// No external dependencies.
// ---------------------------------------------------------------------------

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', 'br']);
const INLINE_TAGS = new Set(['strong', 'em', 'code', 'a', 'mark', 's', 'u']);
const ALLOWED_TAGS = new Set([...BLOCK_TAGS, ...INLINE_TAGS]);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Scan and wrap `*italic*` segments. Avoids the lookbehind regex (Safari < 16.4)
 * and avoids consuming the preceding char (the previous regex did, which broke
 * `*a* *b*` since the space between them was eaten by the first match).
 * A `*` is treated as an italic delimiter only when it is NOT part of a `**`
 * sequence (bold has already been replaced, so any remaining `**` is leftover).
 */
function scanItalic(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '*' && s[i + 1] !== '*' && (i === 0 || s[i - 1] !== '*')) {
      // Look for closing `*` on the same line, with non-empty content
      let j = i + 1;
      while (j < s.length && s[j] !== '*' && s[j] !== '\n') j++;
      if (j < s.length && s[j] === '*' && j > i + 1 && s[j + 1] !== '*') {
        out += `<em>${s.slice(i + 1, j)}</em>`;
        i = j + 1;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

function renderInline(s: string): string {
  // Escape first, then re-apply allowed inline constructs
  let out = escapeHtml(s);
  // inline code `...`
  out = out.replace(/`([^`\n]+)`/g, (_m, g1) => `<code>${g1}</code>`);
  // bold **...**
  out = out.replace(/\*\*([^\*\n]+)\*\*/g, (_m, g1) => `<strong>${g1}</strong>`);
  // italic *...* — manual scan avoids consuming the leading char (which broke
  // patterns like `*a* *b*` when the previous regex used [^\*] as a guard).
  out = scanItalic(out);
  // links [text](href)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, href) => {
    const safeHref = /^https?:\/\//i.test(href) ? href : (href.startsWith('/') || href.startsWith('#') ? href : '#');
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  // marks ==...==
  out = out.replace(/==([^=\n]+)==/g, (_m, g1) => `<mark>${g1}</mark>`);
  return out;
}

/**
 * Render markdown to a sanitized HTML string. Handles headings, paragraphs,
 * fenced code blocks, unordered lists, ordered lists, blockquotes, hr.
 * Not a full MD spec — covers the ~90% used in notebook prose cells.
 */
export function renderProse(content: string): string {
  if (!content) return '';
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading
    const mH = /^(#{1,6})\s+(.*)$/.exec(line);
    if (mH) {
      const level = mH[1].length;
      out.push(`<h${level}>${renderInline(mH[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      out.push('<hr/>');
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i++;
      }
      out.push('<ul>' + items.map((t) => `<li>${renderInline(t)}</li>`).join('') + '</ul>');
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      out.push('<ol>' + items.map((t) => `<li>${renderInline(t)}</li>`).join('') + '</ol>');
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`);
      continue;
    }

    // Blank → paragraph break
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Paragraph: gather contiguous non-empty lines
    const para: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|[-*+]\s|\d+\.\s|>\s?|---+\s*$)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(para.join(' '))}</p>`);
  }

  return sanitize(out.join('\n'));
}

/**
 * Final sanitization pass: allowlist tags + attrs, strip javascript: hrefs and on* handlers.
 */
function sanitize(html: string): string {
  if (typeof document === 'undefined') return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  walk(tpl.content);
  return tpl.innerHTML;
}

function walk(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === 1) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap disallowed tags (keep text)
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        node.removeChild(el);
        continue;
      }
      const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag] ?? new Set<string>();
      for (const attr of Array.from(el.attributes)) {
        if (!allowedAttrs.has(attr.name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (attr.name === 'href' && /^\s*javascript:/i.test(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
      walk(el);
    } else if (child.nodeType !== 3 && child.nodeType !== 8) {
      // Remove anything that's not element / text / comment
      node.removeChild(child);
    }
  }
}

// ---------------------------------------------------------------------------
// Renderer with inject buttons — used by recipe viewer modal.
// Each fenced code block gets an "↳ inject" button next to it.
// ---------------------------------------------------------------------------

export interface InjectFenceEvent {
  lang: string;
  content: string;
}

/**
 * Render markdown into a container. Each fenced code block is rendered with
 * an "↳ inject" button; clicking it calls onInject({lang, content}).
 * Returns a cleanup function.
 */
export function renderMarkdownWithInjectButtons(
  body: string,
  onInject: (e: InjectFenceEvent) => void,
): { root: HTMLElement; destroy: () => void } {
  const root = document.createElement('div');
  root.className = 'nb-md-render';

  const lines = (body || '').replace(/\r\n/g, '\n').split('\n');
  const buf: string[] = [];
  let i = 0;
  const cleanups: Array<() => void> = [];

  const flushProse = () => {
    if (buf.length) {
      const chunk = buf.join('\n');
      const p = document.createElement('div');
      p.innerHTML = renderProse(chunk);
      root.appendChild(p);
      buf.length = 0;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flushProse();
      const lang = line.replace(/^```/, '').trim().toLowerCase() || 'text';
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const content = code.join('\n');

      const block = document.createElement('div');
      block.className = 'nb-md-fence';
      block.innerHTML = `
        <div class="nb-md-fence-head">
          <span class="nb-md-fence-lang">${escapeHtml(lang)}</span>
          <button type="button" class="nb-md-fence-inject">↳ inject</button>
        </div>
        <pre><code class="language-${escapeHtml(lang)}">${escapeHtml(content)}</code></pre>
      `;
      const btn = block.querySelector('.nb-md-fence-inject') as HTMLButtonElement;
      const handler = () => onInject({ lang, content });
      btn.addEventListener('click', handler);
      cleanups.push(() => btn.removeEventListener('click', handler));
      root.appendChild(block);
      continue;
    }
    buf.push(line);
    i++;
  }
  flushProse();

  return {
    root,
    destroy: () => cleanups.forEach((f) => f()),
  };
}
