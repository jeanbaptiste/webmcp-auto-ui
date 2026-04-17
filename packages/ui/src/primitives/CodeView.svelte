<script lang="ts">
  import { highlightCode } from './markdown-renderer.js';
  import 'highlight.js/styles/github-dark.css';

  interface Props {
    source: string;
    lang?: string;
    class?: string;
  }

  let { source, lang = 'plaintext', class: className = '' }: Props = $props();
  const highlighted = $derived(highlightCode(source ?? '', lang));
</script>

<pre class="code-view hljs-pre {className}"><code class="hljs language-{lang}">{@html highlighted}</code></pre>

<style>
  pre.code-view {
    background: #0d1117;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.375rem;
    padding: 0;
    margin: 0;
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.7rem;
    line-height: 1.5;
  }
  pre.code-view :global(code.hljs) {
    display: block;
    padding: 0.7rem;
    background: transparent;
  }
</style>
