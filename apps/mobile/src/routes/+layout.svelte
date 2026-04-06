<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { initializeWebMCPPolyfill, cleanupWebMCPPolyfill, listenForAgentCalls, executeToolInternal } from '@webmcp-auto-ui/core';
  let { children } = $props();
  let stop: (() => void) | null = null;
  onMount(() => {
    try { initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true }); } catch {}
    stop = listenForAgentCalls((name, args) => executeToolInternal(name, args));
  });
  onDestroy(() => { stop?.(); cleanupWebMCPPolyfill(); });
</script>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
{@render children()}
