<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
  import {
    initializeWebMCPPolyfill, cleanupWebMCPPolyfill,
    listenForAgentCalls, executeToolInternal,
    createToolGroup, textResult, jsonResult
  } from '@webmcp-auto-ui/core';
  import { loadDemoSkills, listSkills } from '@webmcp-auto-ui/sdk';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';

  let { children } = $props();
  let stopListening: (() => void) | null = null;

  onMount(() => {
    try {
      initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true });
    } catch { /* HTTPS required in prod */ }

    stopListening = listenForAgentCalls((name, args) => executeToolInternal(name, args));
    loadDemoSkills();

    const group = createToolGroup('composer');
    const mc = (navigator as unknown as Record<string, unknown>).modelContext as {
      registerTool: (t: unknown) => void;
    } | undefined;

    if (mc) {
      mc.registerTool({
        name: 'get_composer_info',
        description: 'Get current composer state: mode, LLM, MCP connection, block count.',
        inputSchema: { type: 'object', properties: {} },
        execute: () => jsonResult({
          mode: canvas.mode, llm: canvas.llm,
          mcpConnected: canvas.mcpConnected, mcpName: canvas.mcpName,
          mcpUrl: canvas.mcpUrl, blockCount: canvas.blockCount,
          generating: canvas.generating,
        }),
        annotations: { readOnlyHint: true },
      });

      mc.registerTool({
        name: 'list_canvas_blocks',
        description: 'List all blocks currently on the canvas with their type and data.',
        inputSchema: { type: 'object', properties: {} },
        execute: () => jsonResult(canvas.blocks.map(b => ({ id: b.id, type: b.type, data: b.data }))),
        annotations: { readOnlyHint: true },
      });

      mc.registerTool({
        name: 'get_hyperskill_url',
        description: 'Get the current canvas as a HyperSkills URL (?hs= format).',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          const param = await canvas.buildHyperskillParam();
          return textResult(`${window.location.origin}/composer?hs=${param}`);
        },
        annotations: { readOnlyHint: true },
      });

      mc.registerTool({
        name: 'list_skills',
        description: 'List all available skills.',
        inputSchema: { type: 'object', properties: {} },
        execute: () => jsonResult(listSkills().map(s => ({ id: s.id, name: s.name, description: s.description, tags: s.tags }))),
        annotations: { readOnlyHint: true },
      });

      mc.registerTool({
        name: 'clear_canvas',
        description: 'Clear all blocks from the canvas.',
        inputSchema: { type: 'object', properties: {} },
        execute: () => { canvas.clearBlocks(); return textResult('Canvas cleared'); },
        annotations: { destructiveHint: true },
      });
    }

    return () => {
      group.abort();
      if (mc) {
        ['get_composer_info','list_canvas_blocks','get_hyperskill_url','list_skills','clear_canvas'].forEach(n => {
          try { (mc as unknown as { unregisterTool: (n: string) => void }).unregisterTool(n); } catch { /* ok */ }
        });
      }
    };
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
