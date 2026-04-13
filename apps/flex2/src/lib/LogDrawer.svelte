<script lang="ts">
  import { AgentConsole } from '@webmcp-auto-ui/ui';

  interface Props {
    open: boolean;
    logs: { ts: number; type: string; detail: string; ctxSize?: number }[];
    onclear: () => void;
  }

  let { open, logs, onclear }: Props = $props();

  let height = $state(200);
  let dragging = $state(false);
  let startY = $state(0);
  let startH = $state(0);

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

    <AgentConsole {logs} {onclear} />
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
</style>
