<script lang="ts">
  import {
    Card, Panel, GridLayout, List, Window,
    StatBlock, KVBlock, ListBlock, ChartBlock, AlertBlock, CodeBlock, TextBlock, ActionsBlock, TagsBlock,
    StatCard, DataTable, Timeline, ProfileCard, Trombinoscope, JsonViewer, Hemicycle,
    Chart, Cards, GridData, Sankey, MapView, LogViewer,
    Pane, TilingLayout, StackLayout,
  } from '@webmcp-auto-ui/ui';
  import {
    INAT_STATS, TOP_SPECIES, TOP_OBSERVERS, MONTHLY_OBS, ICONIC_TAXA, MULTI_SERIES,
    RECENT_OBS, TAXONOMY_TREE, MIGRATION_FLOWS, ALERTS, OBS_TIMELINE, LOG_ENTRIES,
    GRID_DATA, PROFILE_OBSERVER,
  } from '$lib/inat-mock.js';
  import type { ManagedWindow } from '@webmcp-auto-ui/ui';

  // Nav sections
  const SECTIONS = [
    { id: 'primitives',    label: 'Primitives',      count: 5  },
    { id: 'simple',        label: 'Blocs simples',   count: 9  },
    { id: 'rich',          label: 'Widgets riches',  count: 13 },
    { id: 'wm',            label: 'Window Manager',  count: 4  },
  ];

  let active = $state('primitives');

  function scrollTo(id: string) {
    active = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // WM demo state
  const WM_WINDOWS: ManagedWindow[] = [
    { id: 'w1', title: 'StatBlock · Observations', visible: true, focused: false, folded: false, weight: 3, createdAt: 1, lastFocusedAt: 1 },
    { id: 'w2', title: 'Chart · Saisonnalité',      visible: true, focused: false, folded: false, weight: 2, createdAt: 2, lastFocusedAt: 2 },
    { id: 'w3', title: 'KVBlock · Taxon info',      visible: true, focused: false, folded: false, weight: 1, createdAt: 3, lastFocusedAt: 3 },
  ];

  // Format big numbers
  function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }
</script>

<svelte:head><title>UI Showcase — webmcp-auto-ui × iNaturalist</title></svelte:head>

<div class="min-h-screen bg-bg font-sans flex">

  <!-- SIDEBAR NAV -->
  <nav class="w-52 border-r border-border bg-surface flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
    <div class="px-4 pt-5 pb-3">
      <div class="font-mono text-xs font-bold mb-0.5">
        <span class="text-white">webmcp</span><span class="text-accent">-auto-ui</span>
      </div>
      <div class="font-mono text-[10px] text-zinc-600">UI Showcase</div>
    </div>

    <div class="px-3 py-2">
      <div class="flex items-center gap-1.5 text-[10px] font-mono text-teal px-2 py-1 bg-teal/5 rounded border border-teal/20">
        <div class="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></div>
        offline · iNaturalist mock
      </div>
    </div>

    <div class="flex-1 px-2 py-3">
      {#each SECTIONS as s}
        <button class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all mb-0.5
            {active === s.id ? 'bg-accent/10 text-accent border border-accent/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}"
          onclick={() => scrollTo(s.id)}>
          {s.label}
          <span class="float-right text-[10px] opacity-50">{s.count}</span>
        </button>
      {/each}
    </div>

    <div class="px-4 py-4 border-t border-border text-[9px] font-mono text-zinc-700">
      32 composants · Svelte 5<br/>
      données : iNaturalist mock
    </div>
  </nav>

  <!-- MAIN CONTENT -->
  <main class="flex-1 overflow-y-auto">

    <!-- HERO -->
    <div class="border-b border-border bg-surface px-8 py-6">
      <h1 class="font-bold text-2xl mb-1"><span class="text-white">webmcp-auto-ui</span> <span class="text-accent">UI Showcase</span></h1>
      <p class="text-zinc-500 text-sm font-mono">32 composants Svelte 5 · données iNaturalist mockées · offline</p>
    </div>

    <div class="px-8 py-8 flex flex-col gap-16">

      <!-- ── PRIMITIVES ── -->
      <section id="primitives">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-zinc-200">Primitives</h2>
          <span class="text-xs font-mono text-zinc-600 border border-border px-2 py-0.5 rounded">5 composants · briques atomiques</span>
        </div>
        <div class="grid grid-cols-2 gap-4">

          <div>
            <div class="text-xs font-mono text-zinc-600 mb-2">Card · header + body + footer</div>
            <Card>
              {#snippet header()}<span class="text-xs font-mono text-zinc-400">🌿 iNaturalist</span>{/snippet}
              <p class="text-sm text-zinc-300">Observations mondiales : <strong class="text-white">{fmt(INAT_STATS.total_observations)}</strong></p>
              <p class="text-xs text-zinc-600 mt-1">{fmt(INAT_STATS.species_count)} espèces documentées</p>
              {#snippet footer()}<span class="text-[10px] font-mono text-zinc-600">Research Grade : {fmt(INAT_STATS.research_grade)}</span>{/snippet}
            </Card>
          </div>

          <div>
            <div class="text-xs font-mono text-zinc-600 mb-2">Panel · titre + scroll interne</div>
            <Panel title="TOP ESPÈCES FRANCE">
              <List items={TOP_SPECIES.slice(0,4)} maxHeight="120px">
                {#snippet item(it)}
                  {@const sp = it as typeof TOP_SPECIES[0]}
                  <div class="flex items-center justify-between py-1.5 px-1 text-xs">
                    <span>{sp.icon} {sp.common}</span>
                    <span class="font-mono text-zinc-500">{fmt(sp.count)}</span>
                  </div>
                {/snippet}
              </List>
            </Panel>
          </div>

          <div class="col-span-2">
            <div class="text-xs font-mono text-zinc-600 mb-2">GridLayout · cols=3 gap=4</div>
            <GridLayout cols={3} gap={3}>
              {#each ICONIC_TAXA.slice(0,3) as t}
                <Card>
                  <div class="text-center py-2">
                    <div class="text-xs font-mono text-zinc-500 mb-1">{t.label}</div>
                    <div class="text-xl font-bold" style="color:{t.color}">{t.seats}%</div>
                  </div>
                </Card>
              {/each}
            </GridLayout>
          </div>

          <div>
            <div class="text-xs font-mono text-zinc-600 mb-2">Window · draggable=false</div>
            <Window title="Parus major — Great Tit">
              <div class="p-3 text-xs text-zinc-400 font-mono space-y-1">
                <div>Ordre : Passeriformes</div>
                <div>Famille : Paridae</div>
                <div>Obs : {fmt(4_218_221)}</div>
                <div>Statut : LC (UICN)</div>
              </div>
            </Window>
          </div>

          <div>
            <div class="text-xs font-mono text-zinc-600 mb-2">List · slot item personnalisé</div>
            <List items={TOP_OBSERVERS.slice(0,3)} class="bg-surface border border-border rounded-lg">
              {#snippet item(it)}
                {@const ob = it as typeof TOP_OBSERVERS[0]}
                <div class="flex items-center gap-2 px-3 py-2 text-xs">
                  <div class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style="background:{ob.color}">{ob.avatar}</div>
                  <span class="text-zinc-300 flex-1">{ob.name}</span>
                  <span class="font-mono text-zinc-600">{fmt(ob.obs)}</span>
                </div>
              {/snippet}
              {#snippet empty()}<div class="py-4 text-center text-zinc-600 text-xs">Aucun observateur</div>{/snippet}
            </List>
          </div>

        </div>
      </section>

      <!-- ── BLOCS SIMPLES ── -->
      <section id="simple">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-zinc-200">Blocs simples</h2>
          <span class="text-xs font-mono text-zinc-600 border border-border px-2 py-0.5 rounded">9 blocs · PJ référence</span>
        </div>
        <div class="grid grid-cols-3 gap-4">

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">StatBlock</div>
            <StatBlock data={{ label: 'Observations France', value: fmt(INAT_STATS.france_observations), trend: '+18% vs 2025', trendDir: 'up' }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">KVBlock</div>
            <KVBlock data={{ title: 'Parus major', rows: [['Ordre','Passeriformes'],['Famille','Paridae'],['Statut','LC'],['Obs','4.2M']] }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">ListBlock</div>
            <ListBlock data={{ title: 'Espèces récentes', items: RECENT_OBS.map(o => `${o.common} · ${o.place}`) }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">ChartBlock</div>
            <ChartBlock data={{ title: 'Obs mensuelles (k)', bars: MONTHLY_OBS.map(([m, v]) => [m, Math.round((v as number)/1000)]) as [string,number][] }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">AlertBlock</div>
            <AlertBlock data={ALERTS[0]} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">CodeBlock</div>
            <CodeBlock data={{ lang: 'json', content: `{\n  "taxon": "Parus major",\n  "count": 4218221,\n  "status": "LC"\n}` }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">TextBlock</div>
            <TextBlock data={{ content: 'iNaturalist est un réseau social de naturalistes fondé en 2008. Avec 148M+ observations validées, c\'est la plus grande base de données de biodiversité citoyenne au monde.' }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">ActionsBlock</div>
            <ActionsBlock data={{ buttons: [{ label: 'Explorer', primary: true }, { label: 'Exporter CSV' }, { label: 'API docs' }] }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            <div class="text-[10px] font-mono text-zinc-700 px-3 pt-2">TagsBlock</div>
            <TagsBlock data={{ label: 'Filtres', tags: [
              { text: 'Research Grade', active: true },
              { text: 'France', active: true },
              { text: 'Aves' },
              { text: 'Insecta' },
              { text: 'Plantae' },
            ]}} />
          </div>

        </div>
      </section>

      <!-- ── WIDGETS RICHES ── -->
      <section id="rich">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-zinc-200">Widgets riches</h2>
          <span class="text-xs font-mono text-zinc-600 border border-border px-2 py-0.5 rounded">13 widgets · Archive</span>
        </div>
        <div class="flex flex-col gap-6">

          <!-- Row 1: StatCard x3 -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">StatCard — 3 variants</div>
            <div class="grid grid-cols-3 gap-4">
              <StatCard spec={{ label: 'Observations totales', value: '148M+', variant: 'default', trend: 'up', delta: '+12M en 2026' }} />
              <StatCard spec={{ label: 'Research Grade', value: '89.2M', variant: 'success', delta: '60% du total' }} />
              <StatCard spec={{ label: 'Espèces menacées', value: '4 218', variant: 'error', trend: 'down', delta: '-2% UICN' }} />
            </div>
          </div>

          <!-- DataTable -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">DataTable — tri par colonne, striped</div>
            <DataTable spec={{
              title: 'Top espèces observées',
              striped: true,
              columns: [
                { key: 'icon', label: '' },
                { key: 'common', label: 'Nom commun' },
                { key: 'name', label: 'Nom scientifique' },
                { key: 'iconic', label: 'Groupe' },
                { key: 'count', label: 'Observations', align: 'right', type: 'number' },
              ],
              rows: TOP_SPECIES.map(s => ({ icon: s.icon, common: s.common, name: s.name, iconic: s.iconic, count: s.count })),
            }} />
          </div>

          <!-- Timeline + ProfileCard -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">Timeline — statuts done/active/pending</div>
              <Timeline spec={{ title: 'Historique iNaturalist', events: OBS_TIMELINE }} />
            </div>
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">ProfileCard — observatrice #1 France</div>
              <ProfileCard spec={PROFILE_OBSERVER} />
            </div>
          </div>

          <!-- Trombinoscope -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">Trombinoscope — top observateurs</div>
            <Trombinoscope spec={{
              title: 'Top observateurs France',
              columns: 6,
              people: TOP_OBSERVERS.map(o => ({ name: o.name, subtitle: fmt(o.obs) + ' obs', badge: o.badge, color: o.color })),
            }} />
          </div>

          <!-- Chart: bar + line + pie -->
          <div class="grid grid-cols-3 gap-4">
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">Chart — bar</div>
              <Chart spec={{
                title: 'Répartition par groupe',
                type: 'bar',
                labels: ICONIC_TAXA.map(t => t.label),
                data: [{ values: ICONIC_TAXA.map(t => t.seats), color: '#7c6dfa' }],
              }} />
            </div>
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">Chart — line multi-séries</div>
              <Chart spec={{
                title: 'Obs mensuelles par groupe',
                type: 'line',
                labels: MULTI_SERIES.labels,
                data: MULTI_SERIES.datasets,
                legend: true,
              }} />
            </div>
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">Chart — donut</div>
              <Chart spec={{
                title: 'Groupes taxonomiques',
                type: 'donut',
                labels: ICONIC_TAXA.map(t => t.label),
                data: [{ values: ICONIC_TAXA.map(t => t.seats), color: '#7c6dfa' }],
              }} />
            </div>
          </div>

          <!-- Hemicycle -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">Hemicycle — répartition ordres taxonomiques (100 sièges symboliques)</div>
            <Hemicycle spec={{ title: 'Biodiversité observée en France', groups: ICONIC_TAXA, totalSeats: 100 }} />
          </div>

          <!-- Cards -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">Cards — espèces remarquables</div>
            <Cards spec={{
              title: 'Espèces remarquables',
              cards: TOP_SPECIES.slice(0,4).map(s => ({
                title: s.icon + ' ' + s.common,
                subtitle: s.name,
                description: `${fmt(s.count)} observations · ${s.iconic}`,
                tags: [s.iconic],
              })),
            }} />
          </div>

          <!-- JsonViewer + GridData -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">JsonViewer — réponse API taxon</div>
              <JsonViewer spec={{ title: '/v1/taxa/14916', data: TAXONOMY_TREE, maxDepth: 2 }} />
            </div>
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">GridData — obs par groupe × mois</div>
              <GridData spec={{
                title: 'Observations (millions)',
                columns: GRID_DATA.columns,
                rows: GRID_DATA.rows,
                highlights: GRID_DATA.highlights,
              }} />
            </div>
          </div>

          <!-- Sankey + MapView -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">Sankey — flux migratoires (milliers d'obs)</div>
              <Sankey spec={{ title: 'Flux migratoires observés', nodes: MIGRATION_FLOWS.nodes, links: MIGRATION_FLOWS.links }} />
            </div>
            <div>
              <div class="text-xs font-mono text-zinc-600 mb-3">MapView — placeholder (Leaflet requis)</div>
              <MapView spec={{
                title: 'Observations en France',
                center: { lat: 46.6, lng: 2.3 },
                zoom: 6,
                markers: RECENT_OBS.map((o, i) => ({ lat: 46.6 + i * 0.5, lng: 2.3 + i * 0.3, label: o.common })),
                height: '200px',
              }} />
            </div>
          </div>

          <!-- LogViewer -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">LogViewer — flux API iNaturalist</div>
            <LogViewer spec={{ title: 'api.inaturalist.org · logs', entries: LOG_ENTRIES, maxHeight: '180px' }} />
          </div>

        </div>
      </section>

      <!-- ── WINDOW MANAGER ── -->
      <section id="wm">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-zinc-200">Window Manager</h2>
          <span class="text-xs font-mono text-zinc-600 border border-border px-2 py-0.5 rounded">4 layouts · Pane + TilingLayout + StackLayout</span>
        </div>
        <div class="flex flex-col gap-6">

          <!-- TilingLayout -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">TilingLayout — Fibonacci spiral, 3 panes</div>
            <div class="h-64 border border-border rounded-xl overflow-hidden bg-bg">
              <TilingLayout windows={WM_WINDOWS}>
                {#snippet children(win)}
                  <Pane id={win.id} title={win.title} onfold={() => {}} onclose={() => {}}>
                    {#if win.id === 'w1'}
                      <StatBlock data={{ label: 'Observations', value: '148M+', trend: '+12%', trendDir: 'up' }} />
                    {:else if win.id === 'w2'}
                      <ChartBlock data={{ title: 'Mensuel', bars: MONTHLY_OBS.slice(0,6).map(([m,v]) => [m, Math.round((v as number)/1000)]) as [string,number][] }} />
                    {:else}
                      <KVBlock data={{ title: 'Parus major', rows: [['Famille','Paridae'],['Statut','LC']] }} />
                    {/if}
                  </Pane>
                {/snippet}
              </TilingLayout>
            </div>
          </div>

          <!-- StackLayout -->
          <div>
            <div class="text-xs font-mono text-zinc-600 mb-3">StackLayout — mode scroll, poids proportionnels</div>
            <div class="h-64 border border-border rounded-xl overflow-hidden bg-bg">
              <StackLayout windows={WM_WINDOWS} mode="scroll">
                {#snippet children(win)}
                  <Pane id={win.id} title={win.title} onfold={() => {}} onclose={() => {}}>
                    {#if win.id === 'w1'}
                      <AlertBlock data={ALERTS[1]} />
                    {:else if win.id === 'w2'}
                      <TagsBlock data={{ label: 'Groupes', tags: ICONIC_TAXA.slice(0,5).map(t => ({ text: t.label })) }} />
                    {:else}
                      <ListBlock data={{ title: 'Espèces', items: TOP_SPECIES.slice(0,3).map(s => `${s.icon} ${s.common}`) }} />
                    {/if}
                  </Pane>
                {/snippet}
              </StackLayout>
            </div>
          </div>

        </div>
      </section>

    </div><!-- end main content -->
  </main>
</div>
