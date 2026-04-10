<script lang="ts">
  interface Props {
    open: boolean;
    logs: { ts: number; type: string; detail: string }[];
    onclear: () => void;
  }

  let { open, logs, onclear }: Props = $props();

  let height = $state(200);
  let dragging = $state(false);
  let startY = $state(0);
  let startH = $state(0);
  let logsEnd: HTMLDivElement | undefined = $state(undefined);

  const MIN_H = 100;
  const MAX_RATIO = 0.5;

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    startY = e.clientY;
    startH = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const delta = startY - e.clientY;
    const maxH = Math.floor(window.innerHeight * MAX_RATIO);
    height = Math.min(maxH, Math.max(MIN_H, startH + delta));
  }

  function onPointerUp() {
    dragging = false;
  }

  $effect(() => {
    if (logsEnd && logs.length > 0) {
      requestAnimationFrame(() => logsEnd?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    }
  });
</script>

{#if open}
  <div class="log-drawer" style="height:{height}px">
    <!-- Resize bar -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="resize-bar"
         onpointerdown={onPointerDown}
         onpointermove={onPointerMove}
         onpointerup={onPointerUp}>
      <div class="resize-grip"></div>
    </div>

    <!-- Header -->
    <div class="log-header">
      <span class="font-mono text-[9px] text-text2 uppercase tracking-wider">Agent logs</span>
      <span class="font-mono text-[9px] text-text2/50">{logs.length}</span>
      <div class="flex-1"></div>
      {#if logs.length > 0}
        <button class="font-mono text-[9px] text-text2 hover:text-accent transition-colors"
                onclick={onclear}>clear</button>
      {/if}
    </div>

    <!-- Logs content -->
    <div class="log-content">
      {#if logs.length === 0}
        <div class="font-mono text-[9px] text-text2/40 italic py-4 text-center">en attente...</div>
      {:else}
        {#each logs as log}
          <div class="log-entry log-{log.type}">
            <span class="log-ts">{new Date(log.ts).toLocaleTimeString('fr', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
            <span class="log-type">{log.type}</span>
            <span class="log-detail">{log.detail}</span>
          </div>
        {/each}
        <div bind:this={logsEnd}></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .log-drawer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--color-bg, #0e0e16);
    border-top: 1px solid var(--color-border2, #333);
    overflow: hidden;
  }

  .resize-bar {
    height: 6px;
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--color-surface, #1a1a2e);
    border-bottom: 1px solid var(--color-border, #222);
    touch-action: none;
  }
  .resize-bar:hover {
    background: var(--color-surface2, #1e1e2e);
  }
  .resize-grip {
    width: 32px;
    height: 2px;
    border-radius: 1px;
    background: var(--color-text2, #666);
    opacity: 0.4;
  }
  .resize-bar:hover .resize-grip {
    opacity: 0.7;
  }

  .log-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .log-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
    font-family: monospace;
    font-size: 9px;
    line-height: 1.5;
  }

  .log-entry {
    display: flex;
    gap: 6px;
    padding: 1px 0;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    word-break: break-all;
  }
  .log-ts {
    flex-shrink: 0;
    color: var(--color-text2, #666);
    opacity: 0.5;
  }
  .log-type {
    flex-shrink: 0;
    font-weight: 600;
    min-width: 52px;
    text-transform: uppercase;
    font-size: 8px;
  }
  .log-detail {
    color: var(--color-text2, #aaa);
  }
  /* Type colors */
  .log-request .log-type { color: #7aa2f7; }
  .log-response .log-type { color: #9ece6a; }
  .log-tool .log-type { color: #e0af68; }
  .log-text .log-type { color: #737aa2; }
  .log-done .log-type { color: #73daca; }
  .log-iteration .log-type { color: #bb9af7; }
</style>
