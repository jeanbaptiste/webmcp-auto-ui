<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
  import { initializeWebMCPPolyfill, cleanupWebMCPPolyfill } from '@webmcp-auto-ui/core';

  let { children } = $props();

  onMount(() => {
    try { initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true }); } catch {}
  });

  onDestroy(() => { cleanupWebMCPPolyfill(); });
</script>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<ThemeProvider defaultMode="light">
  {@render children()}
</ThemeProvider>
