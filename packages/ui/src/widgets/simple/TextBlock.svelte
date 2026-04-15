<script lang="ts">
  export interface TextBlockData { content?: string; }
  interface Props { data: Partial<TextBlockData>; }
  let { data }: Props = $props();

  /** Minimal markdown → HTML renderer (no deps, naturally XSS-safe: only produces known tags) */
  function renderMarkdown(src: string): string {
    if (!src) return '';

    // Escape HTML entities first (XSS protection)
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

  let rendered = $derived(renderMarkdown(data.content ?? ''));
</script>
<div class="tb-md p-4 md:p-5 text-sm leading-relaxed">{@html rendered}</div>

<style>
  .tb-md { color: var(--color-text2); }
  .tb-md :global(h1) { font-size: 1.5em; font-weight: 700; color: var(--color-text1); margin: 0.8em 0 0.4em; }
  .tb-md :global(h2) { font-size: 1.25em; font-weight: 600; color: var(--color-text1); margin: 0.7em 0 0.35em; }
  .tb-md :global(h3) { font-size: 1.1em; font-weight: 600; color: var(--color-text1); margin: 0.6em 0 0.3em; }
  .tb-md :global(h4), .tb-md :global(h5), .tb-md :global(h6) { font-size: 1em; font-weight: 600; color: var(--color-text1); margin: 0.5em 0 0.25em; }
  .tb-md :global(p) { margin: 0.4em 0; }
  .tb-md :global(strong) { font-weight: 600; color: var(--color-text1); }
  .tb-md :global(em) { font-style: italic; }
  .tb-md :global(a) { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
  .tb-md :global(a:hover) { opacity: 0.8; }
  .tb-md :global(ul), .tb-md :global(ol) { margin: 0.4em 0; padding-left: 1.5em; }
  .tb-md :global(ul) { list-style: disc; }
  .tb-md :global(ol) { list-style: decimal; }
  .tb-md :global(li) { margin: 0.15em 0; }
  .tb-md :global(code) { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 0.9em; background: var(--color-surface2); padding: 0.15em 0.35em; border-radius: 4px; }
  .tb-md :global(pre) { background: var(--color-surface2); border-radius: 6px; padding: 0.75em 1em; margin: 0.5em 0; overflow-x: auto; }
  .tb-md :global(pre code) { background: none; padding: 0; font-size: 0.85em; }
  .tb-md :global(hr) { border: none; border-top: 1px solid var(--color-surface2); margin: 0.8em 0; }
</style>
