<svelte:options customElement={{ tag: 'auto-notebook', shadow: 'none' }} />

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // ---------------------------------------------------------------------------
  // Types (mirror shared.ts without importing it — avoids circular deps)
  // ---------------------------------------------------------------------------

  export interface NotebookCell {
    id: string;
    type: 'md' | 'sql' | 'js';
    content: string;
    status?: 'idle' | 'running' | 'done' | 'error' | 'stale';
    hideSource?: boolean;
    hideResult?: boolean;
    lastResult?: unknown;
    lastMs?: number;
  }

  export interface NotebookData {
    id?: string;
    title?: string;
    mode?: 'edit' | 'view';
    autoRun?: boolean;
    hideLiveToggle?: boolean;
    cells?: NotebookCell[];
    /** MCP servers for SQL execution (array of {name, url}) */
    servers?: Array<{ name: string; url?: string }>;
    /** Legacy flat field — also accepted */
    mcpUrl?: string;
  }

  interface Props {
    data?: NotebookData | null;
  }

  let { data = null }: Props = $props();

  // ---------------------------------------------------------------------------
  // DOM ref and vanilla cleanup
  // ---------------------------------------------------------------------------

  let container: HTMLDivElement;
  let cleanup: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Mount / unmount
  // ---------------------------------------------------------------------------

  onMount(async () => {
    if (!container) return;

    // Lazy-import to avoid pulling 900 lines into the Svelte bundle at parse time.
    const { render } = await import('./notebook.js');

    const plainData: Record<string, unknown> = data
      ? (data as Record<string, unknown>)
      : {};

    cleanup = await render(container, plainData);
  });

  onDestroy(() => {
    cleanup?.();
    cleanup = null;
  });
</script>

<!--
  The vanilla render() writes directly into this div.
  No Svelte template content needed — the notebook manages its own DOM.
-->
<div bind:this={container}></div>
