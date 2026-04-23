// @ts-nocheck
// ---------------------------------------------------------------------------
// Lightweight markdown renderer + allowlist sanitizer for notebook prose cells.
// Also: renderMarkdownWithInjectButtons — used by recipe viewer modal.
// No external dependencies.
// ---------------------------------------------------------------------------

import { highlightCode } from '../../primitives/markdown-renderer.js';

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
      const langKey = (lang || 'plaintext').toLowerCase();
      const highlighted = highlightCode(code.join('\n'), langKey);
      out.push(`<pre class="hljs-pre"><code class="hljs language-${escapeHtml(langKey)}">${highlighted}</code></pre>`);
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
// Inline WYSIWYG editor — single contenteditable zone, no dual-view.
// Markdown remains the source of truth: rendered on mount/blur, converted back
// via turndown on input (debounced) and at blur.
// ---------------------------------------------------------------------------

// turndown is loaded lazily (browser-only). Top-level import breaks SSR because
// turndown's CJS internals use require() which throws in ESM scope.
let _td: any = null;
async function ensureTd(): Promise<any> {
  if (_td) return _td;
  if (typeof window === 'undefined') return null;
  // @ts-ignore — turndown ships its own types but we stay ts-nocheck here
  const mod = await import('turndown');
  const TurndownService = mod.default || mod;
  _td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });
  // Preserve <mark> as ==...== (matches our renderer)
  _td.addRule('mark', {
    filter: 'mark',
    replacement: (content: string) => `==${content}==`,
  });
  return _td;
}

async function htmlToMd(html: string): Promise<string> {
  try {
    const t = await ensureTd();
    return t ? t.turndown(html || '') : '';
  } catch { return ''; }
}

function ensureToolbarStyles(): void {
  if (document.getElementById('nbe-wysiwyg-styles')) return;
  const style = document.createElement('style');
  style.id = 'nbe-wysiwyg-styles';
  style.textContent = `
.nbe-prose-wysiwyg {
  display: block;
  min-height: 1.6em;
  max-width: 620px;
  padding: 4px 6px;
  margin-bottom: 4px;
  border: 1px dashed transparent;
  border-radius: 4px;
  outline: none;
  cursor: text;
}
.nbe-prose-wysiwyg:hover { border-color: var(--color-border); }
.nbe-prose-wysiwyg:focus,
.nbe-prose-wysiwyg.nbe-focus {
  border-color: var(--color-border2);
  border-style: solid;
  background: var(--color-bg);
}
.nbe-prose-wysiwyg[data-empty="true"]::before {
  content: attr(data-placeholder);
  color: var(--color-text2);
  font-style: italic;
  pointer-events: none;
}
.nbe-wysiwyg-toolbar {
  position: fixed;
  z-index: 1010;
  display: inline-flex;
  gap: 2px;
  padding: 4px;
  background: var(--color-surface2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.nbe-wysiwyg-toolbar.nbe-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.nbe-wysiwyg-toolbar button {
  background: transparent;
  color: var(--color-text1);
  border: none;
  border-radius: 3px;
  padding: 4px 7px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  min-width: 22px;
}
.nbe-wysiwyg-toolbar button:hover { background: var(--color-surface); }
.nbe-wysiwyg-toolbar button.nbe-wy-strong { font-weight: 700; }
.nbe-wysiwyg-toolbar button.nbe-wy-em { font-style: italic; }
`;
  document.head.appendChild(style);
}

let _toolbarEl: HTMLElement | null = null;
let _activeEditor: HTMLElement | null = null;
let _toolbarCallback: ((cmd: string) => void) | null = null;

function ensureToolbar(): HTMLElement {
  if (_toolbarEl) return _toolbarEl;
  const bar = document.createElement('div');
  bar.className = 'nbe-wysiwyg-toolbar';
  bar.setAttribute('role', 'toolbar');
  const btns: Array<[string, string, string]> = [
    ['bold', 'B', 'nbe-wy-strong'],
    ['italic', 'I', 'nbe-wy-em'],
    ['h2', 'H2', ''],
    ['h3', 'H3', ''],
    ['ul', '• list', ''],
    ['link', 'link', ''],
    ['code', '<>', ''],
  ];
  for (const [cmd, label, cls] of btns) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.cmd = cmd;
    if (cls) b.classList.add(cls);
    // mousedown before focus is lost
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      _toolbarCallback?.(cmd);
    });
    bar.appendChild(b);
  }
  document.body.appendChild(bar);
  _toolbarEl = bar;
  return bar;
}

function positionToolbar(): void {
  if (!_toolbarEl || !_activeEditor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
    _toolbarEl.classList.remove('nbe-visible');
    return;
  }
  // Only show if selection is within active editor
  const range = sel.getRangeAt(0);
  if (!_activeEditor.contains(range.commonAncestorContainer)) {
    _toolbarEl.classList.remove('nbe-visible');
    return;
  }
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    _toolbarEl.classList.remove('nbe-visible');
    return;
  }
  const bar = _toolbarEl;
  bar.classList.add('nbe-visible');
  const barRect = bar.getBoundingClientRect();
  let top = rect.bottom + 6;
  if (top + barRect.height > window.innerHeight) top = rect.top - barRect.height - 6;
  let left = rect.left + rect.width / 2 - barRect.width / 2;
  left = Math.max(6, Math.min(window.innerWidth - barRect.width - 6, left));
  bar.style.top = `${top}px`;
  bar.style.left = `${left}px`;
}

function hideToolbar(): void {
  _toolbarEl?.classList.remove('nbe-visible');
}

function execCmd(cmd: string, editor: HTMLElement): void {
  editor.focus();
  switch (cmd) {
    case 'bold': document.execCommand('bold'); break;
    case 'italic': document.execCommand('italic'); break;
    case 'h2': document.execCommand('formatBlock', false, 'H2'); break;
    case 'h3': document.execCommand('formatBlock', false, 'H3'); break;
    case 'ul': document.execCommand('insertUnorderedList'); break;
    case 'code': {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;
      const text = range.toString();
      const codeEl = document.createElement('code');
      codeEl.textContent = text;
      range.deleteContents();
      range.insertNode(codeEl);
      sel.removeAllRanges();
      const r2 = document.createRange();
      r2.setStartAfter(codeEl);
      r2.collapse(true);
      sel.addRange(r2);
      break;
    }
    case 'link': {
      const url = window.prompt('Link URL:');
      if (!url) return;
      document.execCommand('createLink', false, url);
      break;
    }
  }
  // Fire an input event to trigger debounced MD conversion
  editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  requestAnimationFrame(() => positionToolbar());
}

/**
 * Mount a WYSIWYG editor in place of the traditional textarea+preview split.
 * - Single contenteditable zone rendering live markdown.
 * - Floating toolbar (B/I/H2/H3/ul/link/code) shown on text selection.
 * - Paste handler converts HTML → markdown (strips inline styles from Notion/GDocs).
 * - On input (debounced) + on blur, HTML is converted to markdown into `get`/`set`.
 *
 * Returns the host element and a cleanup function.
 */
export function mountEditableProse(opts: {
  getContent: () => string;
  setContent: (md: string) => void;
  onChange?: () => void;
  placeholder?: string;
}): { el: HTMLElement; destroy: () => void } {
  ensureToolbarStyles();
  ensureToolbar();

  const host = document.createElement('div');
  host.className = 'nbe-prose nbe-prose-render nbe-prose-wysiwyg';
  host.contentEditable = 'true';
  host.spellcheck = true;
  host.dataset.placeholder = opts.placeholder ?? 'write prose (markdown, WYSIWYG)…';
  host.innerHTML = renderProse(opts.getContent() || '');
  updateEmptyState(host);

  let debounceId: any = null;
  const scheduleSync = () => {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      flushToMd();
    }, 400);
  };
  const flushToMd = async () => {
    const html = host.innerHTML;
    const md = await htmlToMd(html);
    opts.setContent(md);
    opts.onChange?.();
    updateEmptyState(host);
  };

  const onInput = () => {
    updateEmptyState(host);
    scheduleSync();
    positionToolbar();
  };
  const onFocus = () => {
    host.classList.add('nbe-focus');
    _activeEditor = host;
    _toolbarCallback = (cmd: string) => execCmd(cmd, host);
  };
  const onBlur = () => {
    host.classList.remove('nbe-focus');
    // If focus moves to the toolbar we skip — use a deferred check
    setTimeout(() => {
      if (document.activeElement === host) return;
      if (_toolbarEl && _toolbarEl.contains(document.activeElement)) return;
      if (_activeEditor === host) {
        _activeEditor = null;
        _toolbarCallback = null;
        hideToolbar();
      }
      flushToMd();
    }, 10);
  };
  const onSelectionChange = () => {
    if (_activeEditor === host) positionToolbar();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'b') { e.preventDefault(); execCmd('bold', host); }
    else if (meta && e.key.toLowerCase() === 'i') { e.preventDefault(); execCmd('italic', host); }
    else if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); execCmd('link', host); }
  };
  const onPaste = (e: ClipboardEvent) => {
    const cd = e.clipboardData;
    if (!cd) return;
    const html = cd.getData('text/html');
    const text = cd.getData('text/plain');
    if (html) {
      e.preventDefault();
      // Strip inline styles by routing via turndown → re-render via our MD pipeline
      htmlToMd(html).then((md) => {
        const cleanHtml = renderProse(md);
        document.execCommand('insertHTML', false, cleanHtml);
        scheduleSync();
      });
    } else if (text) {
      // Plain text paste — default behaviour fine, but still trigger sync
      scheduleSync();
    }
  };

  host.addEventListener('input', onInput);
  host.addEventListener('focus', onFocus);
  host.addEventListener('blur', onBlur);
  host.addEventListener('keydown', onKeyDown);
  host.addEventListener('paste', onPaste);
  document.addEventListener('selectionchange', onSelectionChange);

  return {
    el: host,
    destroy: () => {
      if (debounceId) clearTimeout(debounceId);
      host.removeEventListener('input', onInput);
      host.removeEventListener('focus', onFocus);
      host.removeEventListener('blur', onBlur);
      host.removeEventListener('keydown', onKeyDown);
      host.removeEventListener('paste', onPaste);
      document.removeEventListener('selectionchange', onSelectionChange);
      if (_activeEditor === host) {
        _activeEditor = null;
        _toolbarCallback = null;
        hideToolbar();
      }
    },
  };
}

function updateEmptyState(host: HTMLElement): void {
  const txt = (host.textContent || '').trim();
  if (!txt && host.children.length <= 1) {
    host.dataset.empty = 'true';
  } else {
    host.dataset.empty = 'false';
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
        <pre class="hljs-pre"><code class="hljs language-${escapeHtml(lang)}">${highlightCode(content, lang)}</code></pre>
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
