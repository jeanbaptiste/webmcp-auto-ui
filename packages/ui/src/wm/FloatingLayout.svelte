<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { computeFloatingLayout, bringToFront } from '../lib/wm-layouts.js';
  import type { ManagedWindow, LayoutWindow, FloatingWindowState } from '../lib/wm-layouts.js';

  interface SnippetCtx {
    ondragstart: (e: MouseEvent) => void;
    onmove: (id: string, x: number, y: number) => void;
    ontogglecollapse: () => void;
    onfittocontent: () => void;
    collapsed: boolean;
  }

  interface Props {
    windows: ManagedWindow[];
    gap?: number;
    defaultWidth?: number;
    defaultHeight?: number;
    onmove?: (id: string, x: number, y: number) => void;
    onresize?: (id: string, w: number, h: number) => void;
    children: Snippet<[ManagedWindow, LayoutWindow, SnippetCtx]>;
  }

  let { windows, gap = 4, defaultWidth = 400, defaultHeight = 300, onmove, onresize, children }: Props = $props();

  let el = $state<HTMLDivElement | null>(null);
  let cw = $state(0), ch = $state(0);
  let saved = $state(new Map<string, FloatingWindowState>());
  let layout = $state<LayoutWindow[]>([]);

  // ── Collapse/Expand ────────────────────────────────────────────────────
  const TITLE_BAR_H = 32;
  let collapsed = $state(new Set<string>());
  let preCollapseHeight = $state(new Map<string, number>());

  export function toggleCollapse(id: string) {
    const lw = lmap.get(id);
    if (!lw) return;
    if (collapsed.has(id)) {
      // Expand — restore previous height
      const h = preCollapseHeight.get(id) ?? defaultHeight;
      collapsed = new Set([...collapsed].filter(x => x !== id));
      preCollapseHeight = new Map(preCollapseHeight); preCollapseHeight.delete(id);
      resize(id, lw.width, h);
    } else {
      // Collapse — save height, shrink to title bar
      preCollapseHeight = new Map(preCollapseHeight).set(id, lw.height);
      collapsed = new Set([...collapsed, id]);
      saved = new Map(saved).set(id, { x: lw.x, y: lw.y, width: lw.width, height: TITLE_BAR_H, zIndex: lw.zIndex });
      layout = layout.map(w => w.id === id ? { ...w, height: TITLE_BAR_H } : w);
    }
  }

  // ── Fit to content ─────────────────────────────────────────────────────
  export function fitToContent(id: string) {
    const lw = lmap.get(id);
    if (!lw) return;
    const winEl = el?.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
    if (!winEl) return;
    const contentEl = winEl.querySelector('.flex-1.overflow-auto') as HTMLElement | null;
    if (!contentEl) return;
    // Un-collapse first if needed
    if (collapsed.has(id)) {
      collapsed = new Set([...collapsed].filter(x => x !== id));
      preCollapseHeight = new Map(preCollapseHeight); preCollapseHeight.delete(id);
    }
    const fitH = Math.min(ch - 32, contentEl.scrollHeight + TITLE_BAR_H + 8);
    resize(id, lw.width, Math.max(80, fitH));
  }

  const mobile = $derived(cw > 0 && cw < 640);

  $effect(() => {
    if (cw === 0 || ch === 0) return;
    // Track windows/container changes but NOT saved — saved is updated
    // directly by move/resize and should not re-trigger full layout recomputation.
    // Reading saved inside untrack prevents the infinite re-render loop during drag.
    const s = untrack(() => saved);
    layout = computeFloatingLayout(windows, { containerWidth: cw, containerHeight: ch, gap, defaultWidth, defaultHeight }, s);
  });

  const lmap = $derived(new Map(layout.map(lw => [lw.id, lw])));

  // Canvas grows to fit all windows
  const canvasW = $derived(
    layout.length ? Math.max(cw, ...layout.map(w => w.x + w.width + 32)) : cw
  );
  const canvasH = $derived(
    layout.length ? Math.max(ch, ...layout.map(w => w.y + w.height + 32)) : ch
  );

  function focus(id: string) { layout = bringToFront(layout, id); }

  // ── Move ─────────────────────────────────────────────────────────────────
  export function move(id: string, x: number, y: number) {
    const lw = lmap.get(id);
    if (!lw) return;
    saved = new Map(saved).set(id, { x, y, width: lw.width, height: lw.height, zIndex: lw.zIndex });
    layout = layout.map(w => w.id === id ? { ...w, x, y } : w);
    focus(id);
    onmove?.(id, x, y);
  }

  let drag = $state<string | null>(null);
  let dsx = $state(0), dsy = $state(0), wsx = $state(0), wsy = $state(0);

  function dragStart(id: string, e: MouseEvent) {
    drag = id; dsx = e.clientX; dsy = e.clientY;
    const lw = lmap.get(id); wsx = lw?.x ?? 0; wsy = lw?.y ?? 0;
    focus(id);
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  export function resize(id: string, w: number, h: number) {
    const lw = lmap.get(id);
    if (!lw) return;
    saved = new Map(saved).set(id, { x: lw.x, y: lw.y, width: w, height: h, zIndex: lw.zIndex });
    layout = layout.map(win => win.id === id ? { ...win, width: w, height: h } : win);
    onresize?.(id, w, h);
  }

  let rdrag = $state<string | null>(null);
  let rsx = $state(0), rsy = $state(0), rww = $state(0), rwh = $state(0);

  function resizeStart(id: string, e: MouseEvent) {
    e.stopPropagation();
    rdrag = id; rsx = e.clientX; rsy = e.clientY;
    const lw = lmap.get(id); rww = lw?.width ?? defaultWidth; rwh = lw?.height ?? defaultHeight;
    focus(id);
  }

  // ── Mouse events ─────────────────────────────────────────────────────────
  function mm(e: MouseEvent) {
    if (drag) {
      const lw = lmap.get(drag);
      if (!lw) return;
      const nx = Math.max(0, wsx + e.clientX - dsx);
      const ny = Math.max(0, wsy + e.clientY - dsy);
      move(drag, nx, ny);
    } else if (rdrag) {
      const lw = lmap.get(rdrag);
      if (!lw) return;
      const nw = Math.max(120, rww + e.clientX - rsx);
      const nh = Math.max(80,  rwh + e.clientY - rsy);
      saved = new Map(saved).set(rdrag, { x: lw.x, y: lw.y, width: nw, height: nh, zIndex: lw.zIndex });
      layout = layout.map(w => w.id === rdrag ? { ...w, width: nw, height: nh } : w);
      onresize?.(rdrag, nw, nh);
    }
  }

  function mu() { drag = null; rdrag = null; }

  $effect(() => {
    if (!el) return;
    const ro = new ResizeObserver(e => { const r = e[0]; if (r) { cw = r.contentRect.width; ch = r.contentRect.height; } });
    ro.observe(el);
    return () => ro.disconnect();
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative w-full h-full" bind:this={el}>

  {#if mobile}
    <!-- ── Mobile: stacked scrollable layout ───────────────────────────────── -->
    <div class="absolute inset-0 overflow-y-auto">
      <div class="flex flex-col gap-3 p-2">
        {#each windows as win (win.id)}
          {#if win.visible !== false}
            {@const lw = { id: win.id, x: 0, y: 0, width: cw, height: defaultHeight, zIndex: 1, visible: true, folded: false }}
            <div style="min-height:{defaultHeight}px;">
              {@render children(win, lw, { ondragstart: () => {}, onmove: () => {}, ontogglecollapse: () => {}, onfittocontent: () => {}, collapsed: false })}
            </div>
          {/if}
        {/each}
      </div>
    </div>

  {:else}
    <!-- ── Desktop: scrollable floating canvas ─────────────────────────────── -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="absolute inset-0 overflow-auto"
         onmousemove={mm} onmouseup={mu} onmouseleave={mu}>
      <div class="relative" style="width:{canvasW}px;height:{canvasH}px;">
        {#each windows as win (win.id)}
          {@const lw = lmap.get(win.id)}
          {#if lw && lw.visible}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="absolute"
                 style="left:{lw.x}px;top:{lw.y}px;width:{lw.width}px;height:{lw.height}px;z-index:{lw.zIndex};transition:height 0.15s ease;"
                 onmousedown={() => focus(win.id)}>
              {@render children(win, lw, {
                ondragstart: (e) => dragStart(win.id, e),
                onmove: (id, x, y) => move(id, x, y),
                ontogglecollapse: () => toggleCollapse(win.id),
                onfittocontent: () => fitToContent(win.id),
                collapsed: collapsed.has(win.id),
              })}
              <!-- Resize handle (SE corner) -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="absolute bottom-0 right-0 w-5 h-5 z-50 cursor-se-resize flex items-end justify-end p-1
                          opacity-0 hover:opacity-60 transition-opacity"
                   onmousedown={(e) => resizeStart(win.id, e)}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" class="text-text2">
                  <path d="M1 7L7 1M4 7L7 4" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

</div>
