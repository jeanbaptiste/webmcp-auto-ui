<script lang="ts">
  import { type Component, onMount, onDestroy } from 'svelte';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import { bus } from '../messaging/bus.svelte.js';
  // Simple widgets
  import StatBlock from './simple/StatBlock.svelte';
  import KVBlock from './simple/KVBlock.svelte';
  import ListBlock from './simple/ListBlock.svelte';
  import ChartBlock from './simple/ChartBlock.svelte';
  import AlertBlock from './simple/AlertBlock.svelte';
  import CodeBlock from './simple/CodeBlock.svelte';
  import TextBlock from './simple/TextBlock.svelte';
  import ActionsBlock from './simple/ActionsBlock.svelte';
  import TagsBlock from './simple/TagsBlock.svelte';
  // Rich widgets
  import StatCard from './rich/StatCard.svelte';
  import DataTable from './rich/DataTable.svelte';
  import Timeline from './rich/Timeline.svelte';
  import ProfileCard from './rich/ProfileCard.svelte';
  import Trombinoscope from './rich/Trombinoscope.svelte';
  import JsonViewer from './rich/JsonViewer.svelte';
  import Hemicycle from './rich/Hemicycle.svelte';
  import Chart from './rich/Chart.svelte';
  import Cards from './rich/Cards.svelte';
  import GridData from './rich/GridData.svelte';
  import Sankey from './rich/Sankey.svelte';
  import MapView from './rich/MapView.svelte';
  import D3Widget from './rich/D3Widget.svelte';
  import JsSandbox from './rich/JsSandbox.svelte';
  import LogViewer from './rich/LogViewer.svelte';
  import Gallery from './rich/Gallery.svelte';
  import Carousel from './rich/Carousel.svelte';

  type Emit = (action: string, payload: unknown) => void;

  /** Native widget entry: component + prop builder */
  type NativeEntry = {
    component: Component<any>;
    props: (data: Record<string, unknown>, emit: Emit) => Record<string, unknown>;
  };

  /** Simple helper: passes { data } */
  const d = (c: Component<any>): NativeEntry => ({
    component: c,
    props: (data) => ({ data }),
  });

  /** Spec helper: passes { spec } */
  const s = (c: Component<any>): NativeEntry => ({
    component: c,
    props: (data) => ({ spec: data }),
  });

  /** Spec + events helper */
  const se = (
    c: Component<any>,
    events: (emit: Emit) => Record<string, unknown>,
  ): NativeEntry => ({
    component: c,
    props: (data, emit) => ({ spec: data, ...events(emit) }),
  });

  /** Static map of all native widget types → component + props */
  const NATIVE_MAP: Record<string, NativeEntry> = {
    // Simple widgets (data prop)
    'stat':           d(StatBlock),
    'kv':             d(KVBlock),
    'list':           d(ListBlock),
    'chart':          d(ChartBlock),
    'alert':          d(AlertBlock),
    'code':           d(CodeBlock),
    'text':           d(TextBlock),
    'actions':        d(ActionsBlock),
    'tags':           d(TagsBlock),
    // Rich widgets (spec prop)
    'stat-card':      s(StatCard),
    'profile':        s(ProfileCard),
    'json-viewer':    s(JsonViewer),
    'chart-rich':     s(Chart),
    'sankey':         s(Sankey),
    'map':            s(MapView),
    'd3':             s(D3Widget),
    'js-sandbox':     s(JsSandbox),
    'log':            s(LogViewer),
    // Rich widgets (spec prop + event callbacks)
    'data-table':     se(DataTable,     (emit) => ({ onrowclick: (row: unknown) => emit('rowclick', row) })),
    'timeline':       se(Timeline,      (emit) => ({ oneventclick: (e: unknown) => emit('eventclick', e) })),
    'trombinoscope':  se(Trombinoscope, (emit) => ({ onpersonclick: (p: unknown) => emit('personclick', p) })),
    'hemicycle':      se(Hemicycle,     (emit) => ({ ongroupclick: (g: unknown) => emit('groupclick', g) })),
    'cards':          se(Cards,         (emit) => ({ oncardclick: (c: unknown) => emit('cardclick', c) })),
    'grid-data':      se(GridData,      (emit) => ({ oncellclick: (r: unknown, c: unknown, v: unknown) => emit('cellclick', { row: r, col: c, value: v }) })),
    'gallery':        se(Gallery,       (emit) => ({ onimageclick: (img: unknown, i: unknown) => emit('imageclick', { image: img, index: i }) })),
    'carousel':       se(Carousel,      (emit) => ({ onslidechange: (slide: unknown, i: unknown) => emit('slidechange', { slide, index: i }) })),
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

  // ── Renderer resolution: servers > native > fallback ────────────

  // Look up a custom renderer from connected WebMCP servers
  const customRenderer = $derived.by(() => {
    if (!servers) return null;
    for (const server of servers) {
      const w = server.getWidget(type);
      if (w?.renderer) return w.renderer;
    }
    return null;
  });

  const nativeEntry: NativeEntry | undefined = $derived(
    customRenderer ? undefined : NATIVE_MAP[type],
  );

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

{#if customRenderer}
  <svelte:component this={customRenderer} {data} {id} />
{:else if nativeEntry}
  <svelte:component this={nativeEntry.component} {...nativeEntry.props(data, emit)} />
{:else}
  <div class="p-3 font-mono text-xs text-text2">[{type}]</div>
{/if}
