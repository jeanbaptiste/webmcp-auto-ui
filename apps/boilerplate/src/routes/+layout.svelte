<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
  import { initializeWebMCPPolyfill, cleanupWebMCPPolyfill, listenForAgentCalls, executeToolInternal } from '@webmcp-auto-ui/core';

  let { children } = $props();
  let stop: (() => void) | null = null;

  onMount(() => {
    try { initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true }); } catch {}
    stop = listenForAgentCalls((name, args) => executeToolInternal(name, args));
  });

  onDestroy(() => { stop?.(); cleanupWebMCPPolyfill(); });
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<ThemeProvider defaultMode="light">
  {@render children()}
</ThemeProvider>
