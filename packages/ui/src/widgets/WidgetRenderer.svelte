<script lang="ts">
  import { type Component, onMount, onDestroy, untrack } from 'svelte';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import { bus } from '../messaging/bus.svelte.js';

  // Monotonic counter for busId generation — avoids collisions on sub-ms remounts.
  let busIdCounter = 0;
  function makeBusId(widgetType: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `block_${widgetType}_${crypto.randomUUID()}`;
    }
    return `block_${widgetType}_${Date.now()}-${++busIdCounter}`;
  }

  // Safe clone for data passed to vanilla renderers — strips Svelte 5 $state
  // proxies, then falls back to a JSON pass that drops non-serializable values.
  function safeClone<T>(value: T): T {
    if (value === null || typeof value !== 'object') return value;
    try {
      return structuredClone(value);
    } catch {
      try {
        const seen = new WeakSet<object>();
        return JSON.parse(JSON.stringify(value, (_k, v) => {
          if (v === null || v === undefined) return v;
          const t = typeof v;
          if (t === 'function' || t === 'symbol' || t === 'bigint') return undefined;
          if (t !== 'object') return v;
          if (typeof Node !== 'undefined' && v instanceof Node) return undefined;
          if (typeof Window !== 'undefined' && v instanceof Window) return undefined;
          if (typeof Event !== 'undefined' && v instanceof Event) return undefined;
          if (seen.has(v)) return undefined;
          seen.add(v);
          return v;
        })) as T;
      } catch {
        return value;
      }
    }
  }

  // ── Native custom-element widgets (Svelte 5 compiled) ────────────────────
  // Side-effect imports register the custom elements with the browser.
  // Simple (9)
  import './simple/stat.svelte';
  import './simple/kv.svelte';
  import './simple/list.svelte';
  import './simple/chart.svelte';
  import './simple/alert.svelte';
  import './simple/code.svelte';
  import './simple/text.svelte';
  import './simple/actions.svelte';
  import './simple/tags.svelte';
  // Rich (15) — map and d3 intentionally omitted (see plan: handled by leaflet/d3 servers)
  import './rich/stat-card.svelte';
  import './rich/profile.svelte';
  import './rich/json-viewer.svelte';
  import './rich/chart-rich.svelte';
  import './rich/sankey.svelte';
  import './rich/hemicycle.svelte';
  import './rich/data-table.svelte';
  import './rich/timeline.svelte';
  import './rich/trombinoscope.svelte';
  import './rich/cards.svelte';
  import './rich/grid-data.svelte';
  import './rich/js-sandbox.svelte';
  import './rich/log.svelte';
  import './rich/gallery.svelte';
  import './rich/carousel.svelte';
  import './rich/chat-input.svelte';
  // Notebook (1)
  import './notebook/notebook.svelte';
  // Agent browsers (registered as widgets for widget_display)
  import '../agent/RecipeBrowser.svelte';

  /** Native widget types served as custom elements (`<auto-${type}>`). */
  const NATIVE_CUSTOM_ELEMENTS = new Set<string>([
    // Simple
    'stat', 'kv', 'list', 'chart', 'alert', 'code', 'text', 'actions', 'tags',
    // Rich
    'stat-card', 'profile', 'json-viewer', 'chart-rich', 'sankey', 'hemicycle',
    'data-table', 'timeline', 'trombinoscope', 'cards', 'grid-data',
    'js-sandbox', 'log', 'gallery', 'carousel', 'chat-input',
    // Notebook
    'notebook',
    // Agent browsers
    'recipe-browser',
  ]);

  /** A vanilla renderer: returns cleanup or Promise thereof. Still used for
   *  server-provided custom widgets via `widget.vanilla = true`. */
  type VanillaRenderer = (
    container: HTMLElement,
    data: Record<string, unknown>,
  ) => void | (() => void) | Promise<void | (() => void)>;

  /** No native vanilla widgets remain — all native widgets are custom elements. */
  const NATIVE_VANILLA_MAP: Record<string, VanillaRenderer> = {};

  interface Props {
    id?: string;
    type: string;
    data: Record<string, unknown>;
    servers?: WebMcpServer[];
    oninteract?: (type: string, action: string, payload: unknown) => void;
  }
  let { id, type, data, servers, oninteract }: Props = $props();

  // Auto-register on the FONC message bus
  const busId = id ?? makeBusId(type);
  const unregisterBus = bus.register(busId, type, ['data-update', 'interact', '*'], (msg) => {
    if (msg.channel === 'data-update' && msg.payload && typeof msg.payload === 'object') {
      oninteract?.(type, 'bus-update', msg.payload);
    }
  });

  /** Emit interaction both to parent callback AND to the bus */
  function emit(action: string, payload: unknown) {
    oninteract?.(type, action, payload);
    bus.broadcast(busId, 'interact', { type, action, payload });
  }

  // ── Renderer resolution: servers > native custom-element > native vanilla > fallback ────

  // Look up a custom widget entry from connected WebMCP servers
  const customWidgetEntry = $derived.by(() => {
    if (!servers) return null;
    for (const server of servers) {
      const w = server.getWidget(type);
      if (w?.renderer) return w;
    }
    return null;
  });

  const customRenderer = $derived(customWidgetEntry?.renderer ?? null);
  const isCustomVanilla = $derived(customWidgetEntry?.vanilla === true);

  /** True if this widget type is served as a native Svelte-compiled custom element. */
  const isNativeCustomElement = $derived(
    !customRenderer && NATIVE_CUSTOM_ELEMENTS.has(type),
  );

  const nativeVanillaRenderer = $derived<VanillaRenderer | undefined>(
    customRenderer || isNativeCustomElement ? undefined : NATIVE_VANILLA_MAP[type],
  );

  /** True when a vanilla renderer (custom or native) should be used */
  const useVanilla = $derived(isCustomVanilla || !!nativeVanillaRenderer);

  /** The effective vanilla renderer to invoke */
  const vanillaRenderer = $derived<VanillaRenderer | null>(
    isCustomVanilla
      ? (customRenderer as VanillaRenderer)
      : (nativeVanillaRenderer ?? null),
  );

  // Deep-clone data to strip Svelte 5 $state proxies — vanilla renderers + third-party
  // libs (D3, Leaflet, etc.) rely on Object.defineProperty which conflicts with proxies.
  const plainData: Record<string, unknown> = $derived(safeClone(data) as Record<string, unknown>);

  // ── Custom element container + element handle ─────────
  let ceContainer: HTMLElement | undefined = $state(undefined);
  let ceElement: HTMLElement | undefined = undefined;

  $effect(() => {
    if (!isNativeCustomElement || !ceContainer) return;
    const tag = `auto-${type}`;
    // Instantiate on first mount. `data` setter is reactive via Svelte 5 custom-element.
    const el = document.createElement(tag) as HTMLElement;
    (el as unknown as { data: unknown }).data = plainData;
    const onInteract = (ev: Event) => {
      const ce = ev as CustomEvent<{ action?: string; payload?: unknown }>;
      const action = ce.detail?.action ?? 'interact';
      emit(action, ce.detail?.payload);
    };
    el.addEventListener('widget:interact', onInteract);
    ceContainer.innerHTML = '';
    ceContainer.appendChild(el);
    ceElement = el;
    return () => {
      el.removeEventListener('widget:interact', onInteract);
      ceElement = undefined;
      if (ceContainer) ceContainer.innerHTML = '';
    };
  });

  // In-place data updates on the custom element — no remount.
  $effect(() => {
    const next = plainData;
    if (!isNativeCustomElement || !ceElement) return;
    (ceElement as unknown as { data: unknown }).data = next;
  });

  // ── Vanilla renderer container + lifecycle ────────────
  let vanillaContainer: HTMLElement | undefined = $state(undefined);

  // Cleanup handle shared between the mount effect and the data-update fallback
  // remount — so a fallback remount can tear down the previous render even
  // though it doesn't re-run the mount effect.
  let currentCleanup: (() => void) | undefined = undefined;
  function runCurrentCleanup() {
    const c = currentCleanup;
    currentCleanup = undefined;
    if (typeof c === 'function') {
      try { c(); } catch (err) { console.error('[WidgetRenderer] cleanup failed:', err); }
    }
  }

  // Mount effect — re-runs only when the widget identity changes (type /
  // renderer / container). Data changes are handled separately to avoid a
  // flickering full remount on every agent update.
  $effect(() => {
    // Touch only the mount deps; `plainData` is intentionally read via untrack
    // so data updates don't retrigger this effect.
    if (!useVanilla || !vanillaRenderer || !vanillaContainer) return;
    const container = vanillaContainer;
    const renderer = vanillaRenderer;
    // If a previous render is still live (e.g. via data-update fallback),
    // tear it down before we clear the DOM.
    runCurrentCleanup();
    container.innerHTML = '';

    const onInteract = (ev: Event) => {
      const ce = ev as CustomEvent<{ action?: string; payload?: unknown }>;
      const action = ce.detail?.action ?? 'interact';
      emit(action, ce.detail?.payload);
    };
    container.addEventListener('widget:interact', onInteract);

    let cancelled = false;

    try {
      const result = renderer(container, untrack(() => plainData));
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<void | (() => void)>).then(
          (c) => {
            // If we were torn down before the promise resolved, invoke the
            // late cleanup immediately rather than leaking resources.
            if (cancelled && typeof c === 'function') {
              try { c(); } catch { /* ignore */ }
            } else {
              currentCleanup = c ?? undefined;
            }
          },
        ).catch((err) => { console.error('[WidgetRenderer] async render failed:', err); });
      } else {
        currentCleanup = (result as (() => void) | undefined) ?? undefined;
      }
    } catch (err) {
      console.error('[WidgetRenderer] sync render failed:', err);
    }

    return () => {
      cancelled = true;
      container.removeEventListener('widget:interact', onInteract);
      runCurrentCleanup();
    };
  });

  // Data-update effect — only triggers when plainData changes. Renderers that
  // support in-place updates should listen for `widget:data-update` and call
  // preventDefault() on the event; doing so signals they've handled the new
  // data themselves so we don't need to remount. Renderers that don't listen
  // fall back to a full remount here (innerHTML cleared + mount effect re-run).
  let firstDataCycle = true;
  $effect(() => {
    const data = plainData;
    if (!vanillaContainer || !useVanilla) return;
    if (firstDataCycle) { firstDataCycle = false; return; }
    const ev = new CustomEvent('widget:data-update', { detail: data, cancelable: true });
    const handled = !vanillaContainer.dispatchEvent(ev);
    if (handled || !vanillaRenderer) return;
    // Not handled — fall back to remount by clearing + calling renderer again.
    // Run the previous cleanup first so the old renderer releases its
    // resources (timers, observers, third-party instances).
    const container = vanillaContainer;
    runCurrentCleanup();
    container.innerHTML = '';
    try {
      const result = vanillaRenderer(container, data);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<void | (() => void)>).then(
          (c) => { currentCleanup = c ?? undefined; },
        ).catch((err) => { console.error('[WidgetRenderer] fallback async render failed:', err); });
      } else {
        currentCleanup = (result as (() => void) | undefined) ?? undefined;
      }
    } catch (err) {
      console.error('[WidgetRenderer] fallback remount failed:', err);
    }
  });

  // ── Auto-register WebMCP tools when modelContext is available ────────────
  type ModelContext = {
    registerTool: (t: unknown) => void;
    unregisterTool: (n: string) => void;
  };

  function getMC(): ModelContext | undefined {
    return (navigator as unknown as Record<string, unknown>).modelContext as ModelContext | undefined;
  }

  onMount(() => {
    const mc = getMC();
    if (!mc) return;

    // Unregister first in case widget was re-mounted with same busId
    const toolNames = [`widget_${busId}_get`, `widget_${busId}_update`, `widget_${busId}_remove`];
    toolNames.forEach(n => { try { mc.unregisterTool(n); } catch { /* ok */ } });

    mc.registerTool({
      name: `widget_${busId}_get`,
      description: `Get current data of ${type} widget (id: ${busId}).`,
      inputSchema: { type: 'object', properties: {} },
      execute: () => ({
        content: [{ type: 'text', text: JSON.stringify({ type, data }) }],
      }),
      annotations: { readOnlyHint: true },
    });

    mc.registerTool({
      name: `widget_${busId}_update`,
      description: `Update the data of ${type} widget (id: ${busId}).`,
      inputSchema: { type: 'object', properties: {}, additionalProperties: true },
      execute: (args: Record<string, unknown>) => {
        oninteract?.(type, 'update', args);
        return { content: [{ type: 'text', text: `widget_${busId} updated` }] };
      },
    });

    mc.registerTool({
      name: `widget_${busId}_remove`,
      description: `Remove ${type} widget (id: ${busId}) from the view.`,
      inputSchema: { type: 'object', properties: {} },
      execute: () => {
        oninteract?.(type, 'remove', {});
        return { content: [{ type: 'text', text: `widget_${busId} removed` }] };
      },
      annotations: { destructiveHint: true },
    });
  });

  onDestroy(() => {
    unregisterBus();
    const mc = getMC();
    if (mc) {
      [`widget_${busId}_get`, `widget_${busId}_update`, `widget_${busId}_remove`]
        .forEach(n => { try { mc.unregisterTool(n); } catch { /* ok */ } });
    }
  });
</script>

{#if isNativeCustomElement}
  <div bind:this={ceContainer} class="ce-container w-full h-full overflow-auto p-2"></div>
{:else if useVanilla}
  <div bind:this={vanillaContainer} class="vanilla-container w-full h-full overflow-auto p-2"></div>
{:else if customRenderer}
  <svelte:component this={customRenderer as Component<any>} {data} {id} />
{:else}
  <div class="p-3 font-mono text-xs text-text2">[{type}]</div>
{/if}

<style>
  .vanilla-container > :global(svg),
  .vanilla-container > :global(canvas),
  .vanilla-container > :global(img) {
    width: 100%;
    height: auto;
    max-height: 100%;
    display: block;
  }
  .vanilla-container > :global(img) {
    object-fit: contain;
  }
</style>
