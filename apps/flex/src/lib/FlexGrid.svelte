<script lang="ts">
  import { onDestroy } from 'svelte';
  import { FloatingLayout, FlexLayout, WidgetRenderer, layoutAdapter, LinkIndicators, linkGroupColor, bus, ExportModal } from '@webmcp-auto-ui/ui';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import type { ManagedWindow } from '@webmcp-auto-ui/ui';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import ProvenanceBadge from './ProvenanceBadge.svelte';

  /** Compute the left-border accent color for a linked widget (or 'transparent'). */
  function linkBorderStyle(widgetId: string): string {
    if (typeof (bus as any).hasLinks !== 'function') return '';
    if (!(bus as any).hasLinks(widgetId)) return '';
    const links = typeof (bus as any).getLinks === 'function' ? (bus as any).getLinks(widgetId) : [];
    if (!Array.isArray(links) || links.length === 0) return '';
    const first = links[0];
    const gid = typeof first === 'object' && first?.groupId ? String(first.groupId) : null;
    if (!gid) return '';
    return `border-left:3px solid ${linkGroupColor(gid)};`;
  }

  interface Props { class?: string; layoutMode?: 'float' | 'grid'; servers?: WebMcpServer[]; oninteract?: (widgetId: string, widgetType: string, action: string, payload: unknown) => void; }
  let { class: cls = '', layoutMode = 'float', servers, oninteract }: Props = $props();

  let windows = $state<ManagedWindow[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fl = $state<any>(null);

  // Track provenance per block: blockId -> { server, component }
  let provenance = $state<Record<string, { server?: string; component?: string }>>({});

  // Export modal state
  let exportTarget = $state<{ type: string; data: Record<string, unknown>; containerEl?: HTMLElement } | null>(null);

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

  export function addBlock(type: string, data: Record<string, unknown>, server?: string, component?: string) {
    const block = canvas.addWidget(type as Parameters<typeof canvas.addBlock>[0], data);
    if (server || component) {
      provenance = { ...provenance, [block.id]: { server, component } };
    }
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

  /** Sync windows from canvas blocks already loaded (e.g. from HyperSkill URL) */
  export function syncFromCanvas() {
    const existing = new Set(windows.map(w => w.id));
    for (const block of canvas.blocks) {
      if (existing.has(block.id)) continue;
      windows = [...windows, {
        id: block.id,
        title: block.type,
        visible: true,
        focused: true,
        folded: false,
        weight: 1,
        createdAt: Date.now(),
        lastFocusedAt: Date.now(),
      }];
    }
  }

  export function clearBlocks() {
    windows = [];
    provenance = {};
    canvas.clearBlocks();
  }

  function closeBlock(id: string) {
    windows = windows.filter(w => w.id !== id);
    delete provenance[id];
    provenance = { ...provenance };
    canvas.removeBlock(id);
  }
</script>

<div class="relative w-full h-full {cls}">
  <!-- Only the active layout is mounted. Mounting both in parallel doubled every
       widget's WebGL context (Chrome caps at 16 → cascade of Context Lost). The
       toggle is a rare manual action, so a remount on switch is acceptable.
       Trade-off: per-window positions/sizes set by the user in FloatingLayout
       (state held in the layout's local `saved` Map) are lost across a
       float→grid→float round trip — windows fall back to the default tiled
       layout from computeFloatingLayout(). Block-level x/y/w/h kept in the
       canvas store survive; only the in-component drag state is reset. -->
  {#if layoutMode === 'grid'}
    <FlexLayout {windows} minWidth={260} maxWidth={600}>
      {#snippet children(win, _lw, _ctx)}
        {@const block = canvas.blocks.find(b => b.id === win.id)}
        {@const prov = provenance[win.id]}
        {#if true}
          {@const widgetContainerRef = { el: null as HTMLElement | null }}
          <div class="relative flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden"
               data-block-id={win.id}>
            <div class="flex items-center gap-2 px-3 py-1.5 bg-surface2/50 border-b border-border shrink-0 select-none"
                 style={linkBorderStyle(win.id)}>
              <span class="text-[10px] font-mono text-text2 flex-1 truncate">{win.title}</span>
              <LinkIndicators busId={win.id} />
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button class="w-4 h-4 text-text2 hover:text-accent text-sm leading-none transition-colors flex-shrink-0"
                      onclick={(e) => { e.stopPropagation(); if (block) exportTarget = { type: block.type, data: block.data, containerEl: widgetContainerRef.el ?? undefined }; }}
                      title="Export">&#x2913;</button>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button class="w-4 h-4 text-text2 hover:text-accent2 text-sm leading-none transition-colors flex-shrink-0"
                      onclick={(e) => { e.stopPropagation(); closeBlock(win.id); }}>x</button>
            </div>
            <div class="flex-1 overflow-auto min-h-0"
                 bind:this={widgetContainerRef.el}>
              {#if block}
                <WidgetRenderer type={block.type} data={block.data} id={block.id} {servers}
                  oninteract={(type, action, payload) => oninteract?.(block.id, type, action, payload)} />
              {/if}
            </div>
            <ProvenanceBadge serverName={prov?.server} componentName={prov?.component} />
          </div>
        {/if}
      {/snippet}
    </FlexLayout>
  {:else}
    <FloatingLayout bind:this={fl} {windows} defaultWidth={380} defaultHeight={280}>
      {#snippet children(win, _lw, ctx)}
        {@const block = canvas.blocks.find(b => b.id === win.id)}
        {@const prov = provenance[win.id]}
        {#if true}
          {@const widgetContainerRef = { el: null as HTMLElement | null }}
          <div class="relative flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden"
               data-block-id={win.id}>
            <div class="flex items-center gap-2 px-3 py-1.5 bg-surface2/50 border-b border-border shrink-0 cursor-move select-none"
                 style={linkBorderStyle(win.id)}
                 onmousedown={(e) => ctx.ondragstart(e)}
                 ondblclick={() => ctx.ontogglecollapse()}>
              <span class="text-[10px] font-mono text-text2 flex-1 truncate">{win.title}</span>
              <LinkIndicators busId={win.id} />
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button class="w-4 h-4 text-text2 hover:text-accent text-sm leading-none transition-colors flex-shrink-0"
                      onclick={(e) => { e.stopPropagation(); ctx.onfittocontent(); }}
                      title="Fit to content">&#x2922;</button>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button class="w-4 h-4 text-text2 hover:text-accent text-sm leading-none transition-colors flex-shrink-0"
                      onclick={(e) => { e.stopPropagation(); if (block) exportTarget = { type: block.type, data: block.data, containerEl: widgetContainerRef.el ?? undefined }; }}
                      title="Export">&#x2913;</button>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button class="w-4 h-4 text-text2 hover:text-accent2 text-sm leading-none transition-colors flex-shrink-0"
                      onclick={(e) => { e.stopPropagation(); closeBlock(win.id); }}>x</button>
            </div>
            {#if !ctx.collapsed}
              <div class="flex-1 overflow-auto min-h-0"
                   bind:this={widgetContainerRef.el}>
                {#if block}
                  <WidgetRenderer type={block.type} data={block.data} id={block.id} {servers}
                  oninteract={(type, action, payload) => oninteract?.(block.id, type, action, payload)} />
                {/if}
              </div>
            {/if}
            <ProvenanceBadge serverName={prov?.server} componentName={prov?.component} />
          </div>
        {/if}
      {/snippet}
    </FloatingLayout>
  {/if}
  <ExportModal
    open={exportTarget !== null}
    type={exportTarget?.type ?? ''}
    data={exportTarget?.data ?? {}}
    containerEl={exportTarget?.containerEl}
    onclose={() => exportTarget = null}
  />
</div>

