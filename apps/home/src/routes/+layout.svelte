<script lang="ts">
  import '../app.css';
  import { PUBLIC_BASE_URL } from '$env/static/public';
  import { onMount, onDestroy } from 'svelte';
  import ThemeProvider from '../../../../packages/ui/src/theme/ThemeProvider.svelte';

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
        { name: 'Flex', url: `${base}/flex`, description: 'WebMCP multi-server, widgets, recipes, lazy loading, debug panel' },
        { name: 'Viewer', url: `${base}/viewer`, description: 'Read-only HyperSkills viewer — decodes and renders widgets' },
        { name: 'Showcase', url: `${base}/showcase`, description: 'Dynamic showcase of all UI components with 3 themes' },
        { name: 'Todo', url: `${base}/todo`, description: 'Minimal reference template to bootstrap a webmcp-auto-ui app' },
        { name: 'Recipes', url: `${base}/recipes`, description: 'MCP and WebMCP recipe explorer' },
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
