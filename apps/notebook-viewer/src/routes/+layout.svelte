<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  let { children } = $props();

  // Only show the "back to index" chip on notebook pages (i.e. /:slug, not /).
  const isNotebookPage = $derived($page.url?.pathname && $page.url.pathname !== '/');

  let theme = $state<'light' | 'dark'>('light');

  onMount(() => {
    const stored = localStorage.getItem('nb-theme');
    theme = stored === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : '';
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : '';
    try { localStorage.setItem('nb-theme', theme); } catch {}
  }
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
    <button type="button" class="nb-nav-theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
      {theme === 'dark' ? '☀' : '☾'}
    </button>
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
