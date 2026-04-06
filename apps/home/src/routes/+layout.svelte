<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
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

    // Register home-level tools
    const group = createToolGroup('home');
    group.register({
      name: 'list_apps',
      description: 'List all available HyperSkill apps with their URLs and descriptions.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult([
        { name: 'HyperSkill Composer', url: 'http://localhost:5174', description: '3-mode UI composer: auto (LLM), drag & drop, chat' },
        { name: 'Todo Demo', url: 'http://localhost:5175', description: 'WebMCP todo list — 8 tools exposed to Chrome extension' },
        { name: 'HyperSkill Viewer', url: 'http://localhost:5176', description: 'Load and edit HyperSkill URLs with diff + traceability' },
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

{@render children()}
