<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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

  interface Props {
    id?: string;
    type: string;
    data: Record<string, unknown>;
    oninteract?: (type: string, action: string, payload: unknown) => void;
  }
  let { id, type, data, oninteract }: Props = $props();

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
      name: `block_${busId}_get`,
      description: `Get current data of ${type} block (id: ${busId}).`,
      inputSchema: { type: 'object', properties: {} },
      execute: () => ({
        content: [{ type: 'text', text: JSON.stringify({ type, data }) }],
      }),
      annotations: { readOnlyHint: true },
    });

    mc.registerTool({
      name: `block_${busId}_update`,
      description: `Update the data of ${type} block (id: ${busId}).`,
      inputSchema: { type: 'object', properties: {}, additionalProperties: true },
      execute: (args: Record<string, unknown>) => {
        oninteract?.(type, 'update', args);
        return { content: [{ type: 'text', text: `block_${busId} updated` }] };
      },
    });

    mc.registerTool({
      name: `block_${busId}_remove`,
      description: `Remove ${type} block (id: ${busId}) from the view.`,
      inputSchema: { type: 'object', properties: {} },
      execute: () => {
        oninteract?.(type, 'remove', {});
        return { content: [{ type: 'text', text: `block_${busId} removed` }] };
      },
      annotations: { destructiveHint: true },
    });
  });

  onDestroy(() => {
    unregisterBus();
    const mc = getMC();
    if (mc) {
      [`block_${busId}_get`, `block_${busId}_update`, `block_${busId}_remove`]
        .forEach(n => { try { mc.unregisterTool(n); } catch { /* ok */ } });
    }
  });
</script>

{#if type === 'stat'}
  <StatBlock data={data} />
{:else if type === 'kv'}
  <KVBlock data={data} />
{:else if type === 'list'}
  <ListBlock data={data} />
{:else if type === 'chart'}
  <ChartBlock data={data} />
{:else if type === 'alert'}
  <AlertBlock data={data} />
{:else if type === 'code'}
  <CodeBlock data={data} />
{:else if type === 'text'}
  <TextBlock data={data} />
{:else if type === 'actions'}
  <ActionsBlock data={data} />
{:else if type === 'tags'}
  <TagsBlock data={data} />
{:else if type === 'stat-card'}
  <StatCard spec={data} />
{:else if type === 'data-table'}
  <DataTable spec={data} onrowclick={(row) => emit('rowclick', row)} />
{:else if type === 'timeline'}
  <Timeline spec={data} oneventclick={(e) => emit('eventclick', e)} />
{:else if type === 'profile'}
  <ProfileCard spec={data} />
{:else if type === 'trombinoscope'}
  <Trombinoscope spec={data} onpersonclick={(p) => emit('personclick', p)} />
{:else if type === 'json-viewer'}
  <JsonViewer spec={data} />
{:else if type === 'hemicycle'}
  <Hemicycle spec={data} ongroupclick={(g) => emit('groupclick', g)} />
{:else if type === 'chart-rich'}
  <Chart spec={data} />
{:else if type === 'cards'}
  <Cards spec={data} oncardclick={(c) => emit('cardclick', c)} />
{:else if type === 'grid-data'}
  <GridData spec={data} oncellclick={(r,c,v) => emit('cellclick', {row:r,col:c,value:v})} />
{:else if type === 'sankey'}
  <Sankey spec={data} />
{:else if type === 'map'}
  <MapView spec={data} />
{:else if type === 'd3'}
  <D3Widget spec={data as import('./rich/D3Widget.svelte').D3Spec} />
{:else if type === 'js-sandbox'}
  <JsSandbox spec={data as import('./rich/JsSandbox.svelte').JsSandboxSpec} />
{:else if type === 'log'}
  <LogViewer spec={data} />
{:else if type === 'gallery'}
  <Gallery spec={data} onimageclick={(img, i) => emit('imageclick', { image: img, index: i })} />
{:else if type === 'carousel'}
  <Carousel spec={data} onslidechange={(slide, i) => emit('slidechange', { slide, index: i })} />
{:else}
  <div class="p-3 font-mono text-xs text-text2">[{type}]</div>
{/if}
