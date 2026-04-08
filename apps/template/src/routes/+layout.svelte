<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
  import {
    initializeWebMCPPolyfill, cleanupWebMCPPolyfill,
    listenForAgentCalls, executeToolInternal,
    createToolGroup, jsonResult,
  } from '@webmcp-auto-ui/core';
  import { loadDemoSkills, listSkills } from '@webmcp-auto-ui/sdk';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';

  let { children } = $props();
  let stop: (() => void) | null = null;

  onMount(() => {
    try { initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true }); } catch {}
    stop = listenForAgentCalls((name, args) => executeToolInternal(name, args));

    loadDemoSkills();

    const group = createToolGroup('template');
    const mc = (navigator as unknown as Record<string, unknown>).modelContext as {
      registerTool: (t: unknown) => void;
      unregisterTool?: (n: string) => void;
    } | undefined;

    if (mc) {
      mc.registerTool({
        name: 'get_template_info',
        description: 'Get info about the Auto-UI template app.',
        inputSchema: { type: 'object', properties: {} },
        execute: () => jsonResult({
          app: 'template', llm: canvas.llm,
          mcpConnected: canvas.mcpConnected, mcpName: canvas.mcpName,
          blockCount: canvas.blockCount, generating: canvas.generating,
        }),
        annotations: { readOnlyHint: true },
      });

      mc.registerTool({
        name: 'list_skills',
        description: 'List all available skills.',
        inputSchema: { type: 'object', properties: {} },
        execute: () => jsonResult(listSkills().map(s => ({ id: s.id, name: s.name, description: s.description, tags: s.tags }))),
        annotations: { readOnlyHint: true },
      });
    }

    return () => {
      group.abort();
      if (mc) {
        ['get_template_info', 'list_skills'].forEach(n => {
          try { mc.unregisterTool?.(n); } catch { /* ok */ }
        });
      }
    };
  });

  onDestroy(() => { stop?.(); cleanupWebMCPPolyfill(); });
</script>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<ThemeProvider defaultMode="light">
  {@render children()}
</ThemeProvider>
