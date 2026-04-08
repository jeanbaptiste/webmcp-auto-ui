<script lang="ts">
  import { onDestroy } from 'svelte';
  import { FloatingLayout, FlexLayout, BlockRenderer, layoutAdapter } from '@webmcp-auto-ui/ui';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import type { ManagedWindow } from '@webmcp-auto-ui/ui';

  interface Props { class?: string; layoutMode?: 'float' | 'grid'; }
  let { class: cls = '', layoutMode = 'float' }: Props = $props();

  let windows = $state<ManagedWindow[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fl = $state<any>(null);

  // Register layout adapter so agent tools can call move/resize/style
  $effect(() => {
    if (!fl) return;
    layoutAdapter.register({
      move:   (id, x, y) => fl?.move(id, x, y),
      resize: (id, w, h) => fl?.resize(id, w, h),
      style:  (id, styles) => {
        const el = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
        if (el) for (const [k, v] of Object.entries(styles)) el.style.setProperty(`--color-${k}`, v);
      },
    });
  });

  onDestroy(() => layoutAdapter.unregister());

  export function addBlock(type: string, data: Record<string, unknown>) {
    const block = canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data);
    windows = [...windows, {
      id: block.id,
      title: type,
      visible: true,
      focused: true,
      folded: false,
      weight: 1,
      createdAt: Date.now(),
      lastFocusedAt: Date.now(),
    }];
    return block;
  }

  export function clearBlocks() {
    windows = [];
    canvas.clearBlocks();
  }

  function closeBlock(id: string) {
    windows = windows.filter(w => w.id !== id);
    canvas.removeBlock(id);
  }
</script>

<div class="w-full h-full {cls}">
  {#if layoutMode === 'grid'}
    <FlexLayout {windows} minWidth={260} maxWidth={600}>
      {#snippet children(win, _lw, _ctx)}
        {@const block = canvas.blocks.find(b => b.id === win.id)}
        <div class="flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden"
             data-block-id={win.id}>
          <div class="flex items-center gap-2 px-3 py-1.5 bg-surface2/50 border-b border-border shrink-0 select-none">
            <span class="text-[10px] font-mono text-text2 flex-1 truncate">{win.title}</span>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button class="w-4 h-4 text-text2 hover:text-accent2 text-sm leading-none transition-colors flex-shrink-0"
                    onclick={(e) => { e.stopPropagation(); closeBlock(win.id); }}>×</button>
          </div>
          <div class="flex-1 overflow-auto min-h-0">
            {#if block}
              <BlockRenderer type={block.type} data={block.data} id={block.id} />
            {/if}
          </div>
        </div>
      {/snippet}
    </FlexLayout>
  {:else}
    <FloatingLayout bind:this={fl} {windows} defaultWidth={380} defaultHeight={280}>
      {#snippet children(win, _lw, ctx)}
        {@const block = canvas.blocks.find(b => b.id === win.id)}
        <div class="flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden"
             data-block-id={win.id}>
          <!-- Title bar — drag handle + double-click to collapse -->
          <div class="flex items-center gap-2 px-3 py-1.5 bg-surface2/50 border-b border-border shrink-0 cursor-move select-none"
               onmousedown={(e) => ctx.ondragstart(e)}
               ondblclick={() => ctx.ontogglecollapse()}>
            <span class="text-[10px] font-mono text-text2 flex-1 truncate">{win.title}</span>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button class="w-4 h-4 text-text2 hover:text-accent text-sm leading-none transition-colors flex-shrink-0"
                    onclick={(e) => { e.stopPropagation(); ctx.onfittocontent(); }}
                    title="Ajuster à la taille du contenu">⤢</button>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button class="w-4 h-4 text-text2 hover:text-accent2 text-sm leading-none transition-colors flex-shrink-0"
                    onclick={(e) => { e.stopPropagation(); closeBlock(win.id); }}>×</button>
          </div>
          <!-- Content (hidden when collapsed) -->
          {#if !ctx.collapsed}
            <div class="flex-1 overflow-auto min-h-0">
              {#if block}
                <BlockRenderer type={block.type} data={block.data} id={block.id} />
              {/if}
            </div>
          {/if}
        </div>
      {/snippet}
    </FloatingLayout>
  {/if}
</div>
