/**
 * Vanilla renderer for the "text" / TextBlock widget.
 *
 * Mirrors the Svelte TextBlock.svelte output: a <div class="tb-md ..."> whose
 * innerHTML is produced by a minimal, XSS-safe markdown -> HTML function.
 *
 * XSS note: renderMarkdown() escapes &, <, >, " BEFORE applying inline rules,
 * so user-controlled text can only reach the DOM as already-escaped entities or
 * as the structural tags we explicitly emit (h1-6, p, strong, em, code, pre, ul,
 * ol, li, a, hr). Using innerHTML here is therefore safe — the function is the
 * single source of trust for sanitization.
 */

export interface TextBlockData {
  content?: string;
}

/** Minimal markdown → HTML renderer (no deps, naturally XSS-safe: only produces known tags) */
function renderMarkdown(src: string): string {
  if (!src) return '';

  // Escape HTML entities first (XSS protection)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const lines = src.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  /** Inline formatting: bold, italic, code, links */
  const inline = (s: string): string => {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  };

  for (const line of lines) {
    // Fenced code block toggle
    if (line.trimStart().startsWith('```')) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeLines = [];
      } else {
        out.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    const trimmed = line.trim();

    // Empty line → close lists, push break
    if (!trimmed) { closeList(); out.push(''); continue; }

    // Headers
    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      closeList();
      const level = hMatch[1].length;
      out.push(`<h${level}>${inline(hMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${inline(olMatch[2])}</li>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeList();
      out.push('<hr>');
      continue;
    }

    // Regular paragraph line
    closeList();
    out.push(`<p>${inline(trimmed)}</p>`);
  }

  // Close any open blocks
  if (inCode) out.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`);
  closeList();

  return out.join('\n');
}

/** Scoped styles — emitted once per document, matching TextBlock.svelte :global rules. */
const STYLE_ID = 'autoui-text-widget-styles';
const STYLE_CSS = `
.tb-md { color: var(--color-text2); }
.tb-md h1 { font-size: 1.5em; font-weight: 700; color: var(--color-text1); margin: 0.8em 0 0.4em; }
.tb-md h2 { font-size: 1.25em; font-weight: 600; color: var(--color-text1); margin: 0.7em 0 0.35em; }
.tb-md h3 { font-size: 1.1em; font-weight: 600; color: var(--color-text1); margin: 0.6em 0 0.3em; }
.tb-md h4, .tb-md h5, .tb-md h6 { font-size: 1em; font-weight: 600; color: var(--color-text1); margin: 0.5em 0 0.25em; }
.tb-md p { margin: 0.4em 0; }
.tb-md strong { font-weight: 600; color: var(--color-text1); }
.tb-md em { font-style: italic; }
.tb-md a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
.tb-md a:hover { opacity: 0.8; }
.tb-md ul, .tb-md ol { margin: 0.4em 0; padding-left: 1.5em; }
.tb-md ul { list-style: disc; }
.tb-md ol { list-style: decimal; }
.tb-md li { margin: 0.15em 0; }
.tb-md code { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 0.9em; background: var(--color-surface2); padding: 0.15em 0.35em; border-radius: 4px; }
.tb-md pre { background: var(--color-surface2); border-radius: 6px; padding: 0.75em 1em; margin: 0.5em 0; overflow-x: auto; }
.tb-md pre code { background: none; padding: 0; font-size: 0.85em; }
.tb-md hr { border: none; border-top: 1px solid var(--color-surface2); margin: 0.8em 0; }
`;

function ensureStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_CSS;
  doc.head.appendChild(style);
}

/**
 * Mount a text / markdown widget into `container`.
 *
 * Returns an `unmount()` function that clears the container and removes any
 * attached listeners.
 */
export function render(container: HTMLElement, data: any): () => void {
  const payload = (data ?? {}) as Partial<TextBlockData>;
  const content = typeof payload.content === 'string' ? payload.content : '';

  ensureStyles(container.ownerDocument ?? document);

  const root = container.ownerDocument.createElement('div');
  root.className = 'tb-md p-4 md:p-5 text-sm leading-relaxed';

  if (!content.trim()) {
    // Empty-state placeholder — keeps layout, signals absence to a11y tree.
    const placeholder = container.ownerDocument.createElement('p');
    placeholder.textContent = '';
    placeholder.setAttribute('aria-label', 'empty text block');
    placeholder.style.opacity = '0.5';
    placeholder.style.fontStyle = 'italic';
    root.appendChild(placeholder);
  } else {
    // Safe: renderMarkdown() escapes user text before emitting tags.
    root.innerHTML = renderMarkdown(content);
  }

  // Delegated click handler — lets links emit widget:interact for host apps
  // (e.g. analytics / canvas telemetry) without blocking default navigation.
  const onClick = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest('a');
    if (!anchor || !root.contains(anchor)) return;
    container.dispatchEvent(
      new CustomEvent('widget:interact', {
        detail: { action: 'link', payload: { href: (anchor as HTMLAnchorElement).href } },
        bubbles: true,
      }),
    );
  };
  root.addEventListener('click', onClick);

  container.appendChild(root);

  return () => {
    root.removeEventListener('click', onClick);
    container.innerHTML = '';
  };
}
