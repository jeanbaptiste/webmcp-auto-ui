<script lang="ts">
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
  import LogViewer from './rich/LogViewer.svelte';

  interface Props {
    type: string;
    data: Record<string, unknown>;
    oninteract?: (type: string, action: string, payload: unknown) => void;
  }
  let { type, data, oninteract }: Props = $props();
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
  <DataTable spec={data} onrowclick={(row) => oninteract?.(type, 'rowclick', row)} />
{:else if type === 'timeline'}
  <Timeline spec={data} oneventclick={(e) => oninteract?.(type, 'eventclick', e)} />
{:else if type === 'profile'}
  <ProfileCard spec={data} />
{:else if type === 'trombinoscope'}
  <Trombinoscope spec={data} onpersonclick={(p) => oninteract?.(type, 'personclick', p)} />
{:else if type === 'json-viewer'}
  <JsonViewer spec={data} />
{:else if type === 'hemicycle'}
  <Hemicycle spec={data} ongroupclick={(g) => oninteract?.(type, 'groupclick', g)} />
{:else if type === 'chart-rich'}
  <Chart spec={data} />
{:else if type === 'cards'}
  <Cards spec={data} oncardclick={(c) => oninteract?.(type, 'cardclick', c)} />
{:else if type === 'grid-data'}
  <GridData spec={data} oncellclick={(r,c,v) => oninteract?.(type, 'cellclick', {row:r,col:c,value:v})} />
{:else if type === 'sankey'}
  <Sankey spec={data} />
{:else if type === 'map'}
  <MapView spec={data} />
{:else if type === 'log'}
  <LogViewer spec={data} />
{:else}
  <div class="p-3 font-mono text-xs text-zinc-600">[{type}]</div>
{/if}
