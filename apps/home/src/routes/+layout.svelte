<script lang="ts">
  import '../app.css';
  import { PUBLIC_BASE_URL } from '$env/static/public';
  import { onMount, onDestroy } from 'svelte';
  import { ThemeProvider } from '@webmcp-auto-ui/ui';

  const base = PUBLIC_BASE_URL ?? '';
  import {
    initializeWebMCPPolyfill, cleanupWebMCPPolyfill,
    listenForAgentCalls, executeToolInternal,
    createToolGroup, textResult, jsonResult
  } from '@webmcp-auto-ui/core';

  let { children } = $props();
  let stopListening: (() => void) | null = null;

  onMount(() => {
    try {
      initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true });
    } catch { /* HTTPS required in production */ }

    stopListening = listenForAgentCalls((name, args) => executeToolInternal(name, args));

    const group = createToolGroup('home');
    group.register({
      name: 'list_apps',
      description: 'List all available HyperSkills apps with their URLs and descriptions.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult([
        { name: 'Flex', url: `${base}/flex2`, description: 'WebMCP multi-serveurs, widgets, recettes, lazy loading, debug panel' },
        { name: 'Viewer', url: `${base}/viewer2`, description: 'Lecteur HyperSkills read-only — décode et affiche les widgets' },
        { name: 'Showcase', url: `${base}/showcase2`, description: 'Démo dynamique de tous les composants UI avec 3 thèmes' },
        { name: 'Todo', url: `${base}/todo2`, description: 'Template minimal de référence pour démarrer une app webmcp-auto-ui' },
        { name: 'Recipes', url: `${base}/recipes`, description: 'Explorateur de recettes MCP et WebMCP' },
      ]),
      annotations: { readOnlyHint: true },
    }, (tool, opts) => (navigator as unknown as { modelContext: { registerTool: (t: unknown, o: unknown) => void } }).modelContext?.registerTool(tool, opts));

    return () => group.abort();
  });

  onDestroy(() => {
    stopListening?.();
    cleanupWebMCPPolyfill();
  });
</script>

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@400;700;800&display=swap" rel="stylesheet" />

<ThemeProvider defaultMode="light">
  {@render children()}
</ThemeProvider>
