<script lang="ts">
  import { type Component, onMount, onDestroy } from 'svelte';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import { bus } from '../messaging/bus.svelte.js';

  // ── Native vanilla renderers ─────────────────────────────────────────────
  // Simple widgets
  import { render as renderStat }    from './simple/stat.js';
  import { render as renderKv }      from './simple/kv.js';
  import { render as renderList }    from './simple/list.js';
  import { render as renderChart }   from './simple/chart.js';
  import { render as renderAlert }   from './simple/alert.js';
  import { render as renderCode }    from './simple/code.js';
  import { render as renderText }    from './simple/text.js';
  import { render as renderActions } from './simple/actions.js';
  import { render as renderTags }    from './simple/tags.js';
  // Rich widgets
  import { render as renderStatCard }      from './rich/stat-card.js';
  import { render as renderProfile }       from './rich/profile.js';
  import { render as renderJsonViewer }    from './rich/json-viewer.js';
  import { render as renderChartRich }     from './rich/chart-rich.js';
  import { render as renderSankey }        from './rich/sankey.js';
  import { render as renderHemicycle }     from './rich/hemicycle.js';
  import { render as renderDataTable }     from './rich/data-table.js';
  import { render as renderTimeline }      from './rich/timeline.js';
  import { render as renderTrombinoscope } from './rich/trombinoscope.js';
  import { render as renderCards }         from './rich/cards.js';
  import { render as renderGridData }      from './rich/grid-data.js';
  import { render as renderMap }           from './rich/map.js';
  import { render as renderD3 }            from './rich/d3.js';
  import { render as renderJsSandbox }    from './rich/js-sandbox.js';
  import { render as renderLog }           from './rich/log.js';
  import { render as renderGallery }       from './rich/gallery.js';
  import { render as renderCarousel }      from './rich/carousel.js';

  /** A vanilla renderer: returns cleanup or Promise thereof. */
  type VanillaRenderer = (
    container: HTMLElement,
    data: Record<string, unknown>,
  ) => void | (() => void) | Promise<void | (() => void)>;

  /** Static map of all native widget types → vanilla renderer */
  const NATIVE_VANILLA_MAP: Record<string, VanillaRenderer> = {
    // Simple
    'stat':           renderStat,
    'kv':             renderKv,
    'list':           renderList,
    'chart':          renderChart,
    'alert':          renderAlert,
    'code':           renderCode,
    'text':           renderText,
    'actions':        renderActions,
    'tags':           renderTags,
    // Rich
    'stat-card':      renderStatCard,
    'profile':        renderProfile,
    'json-viewer':    renderJsonViewer,
    'chart-rich':     renderChartRich,
    'sankey':         renderSankey,
    'hemicycle':      renderHemicycle,
    'data-table':     renderDataTable,
    'timeline':       renderTimeline,
    'trombinoscope':  renderTrombinoscope,
    'cards':          renderCards,
    'grid-data':      renderGridData,
    'map':            renderMap,
    'd3':             renderD3,
    'js-sandbox':     renderJsSandbox,
    'log':            renderLog,
    'gallery':        renderGallery,
    'carousel':       renderCarousel,
  };

  interface Props {
    id?: string;
    type: string;
    data: Record<string, unknown>;
    servers?: WebMcpServer[];
    oninteract?: (type: string, action: string, payload: unknown) => void;
  }
  let { id, type, data, servers, oninteract }: Props = $props();

  // Auto-register on the FONC message bus
  const busId = id ?? `block_${type}_${Date.now().toString(36)}`;
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

  // ── Renderer resolution: servers > native vanilla > fallback ────────────

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

  const nativeVanillaRenderer = $derived<VanillaRenderer | undefined>(
    customRenderer ? undefined : NATIVE_VANILLA_MAP[type],
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
  const plainData: Record<string, unknown> = $derived(JSON.parse(JSON.stringify(data)));

  // ── Vanilla renderer container + lifecycle ────────────
  let vanillaContainer: HTMLElement | undefined = $state(undefined);

  $effect(() => {
    if (!useVanilla || !vanillaRenderer || !vanillaContainer) return;
    const container = vanillaContainer;
    // Clear previous content
    container.innerHTML = '';

    // Listen for the standard vanilla event contract: CustomEvent('widget:interact')
    const onInteract = (ev: Event) => {
      const ce = ev as CustomEvent<{ action?: string; payload?: unknown }>;
      const action = ce.detail?.action ?? 'interact';
      emit(action, ce.detail?.payload);
    };
    container.addEventListener('widget:interact', onInteract);

    let cleanup: (() => void) | void;
    let cancelled = false;

    try {
      const result = vanillaRenderer(container, plainData);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<void | (() => void)>).then(
          (c) => { if (!cancelled) cleanup = c ?? undefined; },
        ).catch((err) => { console.error('[WidgetRenderer] async render failed:', err); });
      } else {
        cleanup = result as (() => void) | void;
      }
    } catch (err) {
      console.error('[WidgetRenderer] sync render failed:', err);
    }

    return () => {
      cancelled = true;
      container.removeEventListener('widget:interact', onInteract);
      if (typeof cleanup === 'function') {
        try { cleanup(); } catch (err) { console.error('[WidgetRenderer] cleanup failed:', err); }
      }
    };
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

{#if useVanilla}
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
