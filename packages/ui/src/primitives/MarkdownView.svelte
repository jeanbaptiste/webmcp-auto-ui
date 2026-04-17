<script lang="ts">
  import { renderMarkdown } from './markdown-renderer.js';
  import 'highlight.js/styles/github-dark.css';

  interface Props {
    source: string;
    class?: string;
  }

  let { source, class: className = '' }: Props = $props();
  const html = $derived(renderMarkdown(source ?? ''));
</script>

<div class="markdown-body {className}">
  {@html html}
</div>

<style>
  .markdown-body :global(h1),
  .markdown-body :global(h2),
  .markdown-body :global(h3),
  .markdown-body :global(h4) {
    font-weight: 600;
    margin-top: 0.75rem;
    margin-bottom: 0.4rem;
    color: inherit;
  }
  .markdown-body :global(h1) { font-size: 1.05rem; }
  .markdown-body :global(h2) { font-size: 0.95rem; }
  .markdown-body :global(h3) { font-size: 0.85rem; }
  .markdown-body :global(h4) { font-size: 0.8rem; }
  .markdown-body :global(p) {
    margin: 0.4rem 0;
    line-height: 1.55;
    font-size: 0.78rem;
  }
  .markdown-body :global(ul),
  .markdown-body :global(ol) {
    margin: 0.4rem 0;
    padding-left: 1.4rem;
    font-size: 0.78rem;
    line-height: 1.55;
  }
  .markdown-body :global(li) { margin: 0.2rem 0; }
  .markdown-body :global(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72rem;
    background: rgba(0, 0, 0, 0.25);
    padding: 0.08rem 0.3rem;
    border-radius: 0.2rem;
  }
  .markdown-body :global(pre.hljs-pre) {
    background: #0d1117;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.375rem;
    padding: 0.7rem;
    margin: 0.5rem 0;
    overflow-x: auto;
  }
  .markdown-body :global(pre.hljs-pre code) {
    background: transparent;
    padding: 0;
    font-size: 0.7rem;
    line-height: 1.5;
  }
  .markdown-body :global(a) {
    color: rgb(96, 165, 250);
    text-decoration: underline;
  }
  .markdown-body :global(strong) { font-weight: 600; }
  .markdown-body :global(em) { font-style: italic; }
  .markdown-body :global(blockquote) {
    border-left: 3px solid rgba(255, 255, 255, 0.15);
    padding-left: 0.7rem;
    margin: 0.5rem 0;
    color: rgba(255, 255, 255, 0.7);
  }
  .markdown-body :global(table) {
    border-collapse: collapse;
    margin: 0.5rem 0;
    font-size: 0.72rem;
  }
  .markdown-body :global(th),
  .markdown-body :global(td) {
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.3rem 0.55rem;
  }
  .markdown-body :global(th) {
    background: rgba(255, 255, 255, 0.04);
    font-weight: 600;
  }
  .markdown-body :global(hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 1rem 0;
  }
</style>
