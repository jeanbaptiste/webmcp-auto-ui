<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { title: string; draggable?: boolean; class?: string; onmove?: (dx: number, dy: number) => void; children: Snippet; }
  let { title, draggable = false, class: cls = '', onmove, children }: Props = $props();
  let dragging = $state(false);
  let sx = $state(0), sy = $state(0);
  function hmd(e: MouseEvent) { if (!draggable) return; dragging = true; sx = e.clientX; sy = e.clientY; }
  function hmm(e: MouseEvent) { if (!dragging) return; onmove?.(e.clientX - sx, e.clientY - sy); sx = e.clientX; sy = e.clientY; }
  function hmu() { dragging = false; }
</script>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex flex-col bg-surface rounded-lg border border-border overflow-hidden {cls}"
  onmousemove={draggable ? hmm : undefined} onmouseup={draggable ? hmu : undefined} onmouseleave={draggable ? hmu : undefined}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex items-center gap-2 px-3 py-2 bg-surface2/50 border-b border-border shrink-0 select-none {draggable ? 'cursor-move' : ''}"
    onmousedown={draggable ? hmd : undefined}>
    <span class="w-2 h-2 rounded-full bg-border2 shrink-0"></span>
    <h3 class="text-xs font-mono text-text2 flex-1 truncate">{title}</h3>
  </div>
  <div class="flex-1 overflow-auto min-h-0">{@render children()}</div>
</div>
