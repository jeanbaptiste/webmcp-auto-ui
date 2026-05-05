<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { HeaderControls } from '@webmcp-auto-ui/ui';
  // Side-effect import: register <auto-chat-input> so the per-cell agent bar
  // (built via innerHTML in the notebook widget) finds the custom element.
  import '@webmcp-auto-ui/ui/widgets/rich/chat-input.svelte';
  import { canvasVanilla } from '@webmcp-auto-ui/sdk/canvas-vanilla';
  import {
    initializeWebMCPPolyfill,
    cleanupWebMCPPolyfill,
    listenForAgentCalls,
    executeToolInternal,
  } from '@webmcp-auto-ui/core';
  let { children } = $props();
  let stop: (() => void) | null = null;

  // The notebook widget reads globalThis.__canvasVanilla for auto-connect of
  // frontmatter-declared MCP servers. Exposing it here is the canonical
  // pattern (same as flex/recipes/template).
  // We also enable the WebMCP polyfill so the page can register tools that
  // expose its content to a connecting agent (extension, IDE, etc.).
  onMount(() => {
    (globalThis as any).__canvasVanilla = canvasVanilla;
    try { initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true }); } catch {}
    stop = listenForAgentCalls((name, args) => executeToolInternal(name, args));
  });
  onDestroy(() => { stop?.(); cleanupWebMCPPolyfill(); });

  // Only show the "back to index" chip on notebook pages (i.e. /:slug, not /).
  const isNotebookPage = $derived($page.url?.pathname && $page.url.pathname !== '/');
</script>

<div class="nb-viewer-root">
  <nav class="nb-nav">
    <a class="nb-nav-logo" href="/">
      <span class="nb-nav-dot"></span>nb.hyperskills.net
    </a>
    {#if isNotebookPage}
      <span class="nb-nav-sep"></span>
      <a class="nb-nav-link" href="/">← index</a>
    {/if}
    <span class="nb-nav-spacer"></span>
    <a class="nb-nav-link" href="https://blog.hyperskills.net" target="_blank" rel="noopener noreferrer">blog</a>
    <a class="nb-nav-link" href="https://github.com/jeanbaptiste/webmcp-auto-ui" target="_blank" rel="noopener noreferrer">github</a>
    <HeaderControls compact />
  </nav>

  <div class="nb-main">
    {@render children()}
  </div>

  <footer class="nb-footer">
    <div class="nb-footer-col">
      <div class="nb-footer-logo"><span class="nb-nav-dot"></span>nb.hyperskills.net</div>
      <div class="nb-footer-note">Notebooks publiés via WebMCP</div>
    </div>
    <div class="nb-footer-col">
      <div class="nb-footer-links">
        <a href="https://blog.hyperskills.net" target="_blank" rel="noopener noreferrer">blog</a>
        <a href="https://github.com/jeanbaptiste/webmcp-auto-ui" target="_blank" rel="noopener noreferrer">github</a>
      </div>
      <div class="nb-footer-license">AGPL-3.0-or-later · CC BY-SA 4.0</div>
    </div>
  </footer>
</div>
