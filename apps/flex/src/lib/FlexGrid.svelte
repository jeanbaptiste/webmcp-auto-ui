<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { mount, unmount } from 'svelte';
  import { GridStack } from 'gridstack';
  import 'gridstack/dist/gridstack.min.css';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { BlockRenderer } from '@webmcp-auto-ui/ui';

  interface Props { class?: string; }
  let { class: cls = '' }: Props = $props();

  let gridEl: HTMLDivElement;
  let grid: GridStack;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mounted = new Map<string, any>();

  const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
    stat:        { w: 3, h: 2 },
    kv:          { w: 4, h: 3 },
    list:        { w: 4, h: 4 },
    chart:       { w: 6, h: 4 },
    'chart-rich':{ w: 6, h: 5 },
    table:       { w: 8, h: 4 },
    alert:       { w: 4, h: 2 },
    code:        { w: 6, h: 4 },
    text:        { w: 4, h: 2 },
    tags:        { w: 4, h: 2 },
    timeline:    { w: 6, h: 5 },
    profile:     { w: 4, h: 4 },
    trombinoscope: { w: 8, h: 5 },
    hemicycle:   { w: 8, h: 6 },
    cards:       { w: 8, h: 5 },
    'json-viewer': { w: 4, h: 4 },
    sankey:      { w: 8, h: 5 },
    'd3':        { w: 6, h: 5 },
    gallery:     { w: 6, h: 5 },
    carousel:    { w: 6, h: 4 },
    log:         { w: 6, h: 4 },
    map:         { w: 8, h: 5 },
  };

  export function addBlock(type: string, data: Record<string, unknown>) {
    const block = canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data);
    const size = DEFAULT_SIZES[type] ?? { w: 4, h: 3 };

    const itemEl = grid.addWidget({
      id: block.id,
      w: size.w,
      h: size.h,
      minW: 2,
      minH: 2,
    });

    const contentEl = itemEl.querySelector('.grid-stack-item-content');
    if (contentEl) {
      const cmp = mount(BlockRenderer, {
        target: contentEl as HTMLElement,
        props: { type, data, id: block.id },
      });
      mounted.set(block.id, cmp);
    }
    return block;
  }

  export function clearBlocks() {
    mounted.forEach(cmp => unmount(cmp));
    mounted.clear();
    grid.removeAll();
    canvas.clearBlocks();
  }

  onMount(() => {
    grid = GridStack.init({
      column: 12,
      cellHeight: 80,
      animate: true,
      float: false,
      margin: 8,
      resizable: { handles: 'se' },
    }, gridEl);
  });

  onDestroy(() => {
    mounted.forEach(cmp => unmount(cmp));
    mounted.clear();
    grid?.destroy(false);
  });
</script>

<div class="gs-wrapper {cls}">
  <div class="grid-stack" bind:this={gridEl}></div>
</div>

<style>
  .gs-wrapper {
    width: 100%;
    height: 100%;
    overflow: auto;
    padding: 8px;
  }

  :global(.grid-stack-item-content) {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    height: 100%;
  }

  :global(.grid-stack-placeholder > .placeholder-content) {
    background: var(--color-accent) !important;
    opacity: 0.08 !important;
    border-radius: 8px !important;
    border: 2px dashed var(--color-accent) !important;
  }

  :global(.grid-stack > .grid-stack-item > .grid-stack-item-content) {
    overflow: auto;
  }

  :global(.ui-resizable-se) {
    opacity: 0;
    transition: opacity 0.2s;
  }
  :global(.grid-stack-item:hover .ui-resizable-se) {
    opacity: 1;
  }
</style>
