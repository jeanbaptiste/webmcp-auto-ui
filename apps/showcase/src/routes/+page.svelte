<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Card, Panel, GridLayout, List, Window,
    StatBlock, KVBlock, ListBlock, ChartBlock, AlertBlock, CodeBlock, TextBlock, ActionsBlock, TagsBlock,
    StatCard, DataTable, Timeline, ProfileCard, Trombinoscope, JsonViewer, Hemicycle,
    Chart, Cards, GridData, Sankey, MapView, LogViewer,
    Gallery, Carousel,
    Pane, TilingLayout, StackLayout, FloatingLayout, FlexLayout,
    Tooltip, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
    BlockRenderer, bus,
  } from '@webmcp-auto-ui/ui';
  import {
    INAT_STATS, TOP_SPECIES, TOP_OBSERVERS, MONTHLY_OBS, ICONIC_TAXA, MULTI_SERIES,
    RECENT_OBS, TAXONOMY_TREE, MIGRATION_FLOWS, ALERTS, OBS_TIMELINE, LOG_ENTRIES,
    GRID_DATA, PROFILE_OBSERVER, GALLERY_IMAGES, CAROUSEL_SLIDES,
    speciesToProfile, observerToProfile, filterSpeciesByGroup,
  } from '$lib/inat-mock.js';
  import type { ManagedWindow } from '@webmcp-auto-ui/ui';
  import { McpConnector, RemoteMCPserversDemo } from '@webmcp-auto-ui/ui';
  import { initializeWebMCPPolyfill, listenForAgentCalls, executeToolInternal, jsonResult, registerSkill, unregisterSkill, McpClient } from '@webmcp-auto-ui/core';
  import { listSkills, createSkill, deleteSkill, updateSkill, loadDemoSkills, MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import type { Skill } from '@webmcp-auto-ui/sdk';

  // Nav sections
  const SECTIONS = [
    { id: 'primitives',    label: 'Primitives',      count: 7  },
    { id: 'simple',        label: 'Blocs simples',   count: 9  },
    { id: 'rich',          label: 'Widgets riches',  count: 13 },
    { id: 'gallery',       label: 'Gallery & Carousel', count: 2 },
    { id: 'd3',            label: 'D3 Visualizations', count: 3 },
    { id: 'skills',        label: 'Recettes CRUD',   count: 0  },
    { id: 'wm',            label: 'Window Manager',  count: 6  },
  ];

  let active = $state('primitives');

  function scrollTo(id: string) {
    active = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── MCP Client state ────────────────────────────────────────────
  let mcpUrl = $state('');
  let mcpConnecting = $state(false);
  let mcpConnected = $state(false);
  let mcpServerName = $state('');
  let mcpError = $state('');
  let mcpClient: McpClient | null = null;
  let connectedUrls = $state<string[]>([]);
  let loadingUrls = $state<string[]>([]);

  async function connectMcp() {
    if (!mcpUrl.trim()) return;
    mcpConnecting = true;
    mcpError = '';
    try {
      mcpClient = new McpClient(mcpUrl.trim());
      const info = await mcpClient.connect();
      mcpConnected = true;
      connectedUrls = [mcpUrl.trim()];
      mcpServerName = info.serverInfo?.name ?? 'Connecté';
      await autoGenerate();
    } catch (e: unknown) {
      mcpError = e instanceof Error ? e.message : 'Erreur de connexion';
      mcpConnected = false;
      mcpClient = null;
    } finally {
      mcpConnecting = false;
    }
  }

  function disconnectMcp() {
    try { (mcpClient as unknown as { close?: () => void })?.close?.(); } catch {}
    mcpClient = null;
    mcpConnected = false;
    mcpServerName = '';
    mcpTools = [];
    autoBlocks = [];
    connectedUrls = [];
  }

  async function connectDemoServer(url: string) {
    if (mcpConnected) disconnectMcp();
    mcpUrl = url;
    loadingUrls = [...loadingUrls, url];
    try {
      await connectMcp();
    } finally {
      loadingUrls = loadingUrls.filter(u => u !== url);
    }
  }

  function disconnectDemoServer(url: string) {
    if (mcpUrl === url) disconnectMcp();
  }

  let mcpTools = $state<{name: string, description: string}[]>([]);
  let autoBlocks = $state<{id: string, type: string, data: Record<string, unknown>}[]>([]);
  let autoGenerating = $state(false);

  async function autoGenerate() {
    if (!mcpClient || !mcpConnected || autoGenerating) return;
    autoGenerating = true;
    autoBlocks = [];
    try {
      const tools = await mcpClient.listTools();
      mcpTools = tools.map((t: any) => ({ name: t.name, description: t.description ?? '' }));
      mcpServerName = `${tools.length} outils — génération…`;

      // Call each tool and generate blocks from results
      for (const tool of tools.slice(0, 8)) {
        try {
          const result = await mcpClient.callTool(tool.name, {});
          const content = result?.content;
          if (!content) continue;

          const textContent = Array.isArray(content)
            ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
            : typeof content === 'string' ? content : JSON.stringify(content);

          const id = 'auto_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

          try {
            const parsed = JSON.parse(textContent);
            if (Array.isArray(parsed)) {
              autoBlocks = [...autoBlocks, { id, type: 'data-table', data: { title: tool.name, rows: parsed.slice(0, 20) } }];
            } else if (typeof parsed === 'object') {
              const rows = Object.entries(parsed).slice(0, 10).map(([k, v]) => [k, String(v)]);
              autoBlocks = [...autoBlocks, { id, type: 'kv', data: { title: tool.name, rows } }];
            }
          } catch {
            autoBlocks = [...autoBlocks, { id, type: 'text', data: { content: `**${tool.name}**\n${textContent.slice(0, 500)}` } }];
          }
        } catch {
          // Tool call failed, skip
        }
      }
      mcpServerName = `✓ ${autoBlocks.length} blocs générés depuis ${tools.length} outils`;
    } catch (e) {
      mcpServerName = `Erreur: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      autoGenerating = false;
    }
  }

  // ── Skills CRUD state ────────────────────────────────────────────
  let skills = $state<Skill[]>([]);
  let newSkillName = $state('');
  let newSkillDesc = $state('');
  let editingId = $state<string | null>(null);
  let editingName = $state('');
  let editingDesc = $state('');

  function refreshSkills() { skills = listSkills(); }

  function handleCreateSkill() {
    if (!newSkillName.trim()) return;
    createSkill({
      name: newSkillName.trim(),
      description: newSkillDesc.trim() || 'Recette personnalisée',
      tags: ['custom'],
      blocks: [],
    });
    newSkillName = '';
    newSkillDesc = '';
    refreshSkills();
  }

  function handleDeleteSkill(id: string) {
    deleteSkill(id);
    refreshSkills();
  }

  function startEdit(skill: Skill) {
    editingId = skill.id;
    editingName = skill.name;
    editingDesc = skill.description ?? '';
  }

  function handleUpdateSkill() {
    if (!editingId) return;
    updateSkill(editingId, { name: editingName.trim(), description: editingDesc.trim() });
    editingId = null;
    refreshSkills();
  }

  function cancelEdit() { editingId = null; }

  // Dialog demo state
  let dialogOpen = $state(false);

  // WM demo state
  const WM_WINDOWS: ManagedWindow[] = [
    { id: 'w1', title: 'StatBlock · Observations', visible: true, focused: false, folded: false, weight: 3, createdAt: 1, lastFocusedAt: 1 },
    { id: 'w2', title: 'Chart · Saisonnalité',      visible: true, focused: false, folded: false, weight: 2, createdAt: 2, lastFocusedAt: 2 },
    { id: 'w3', title: 'KVBlock · Taxon info',      visible: true, focused: false, folded: false, weight: 1, createdAt: 3, lastFocusedAt: 3 },
  ];

  const FLEX_WINDOWS: ManagedWindow[] = [
    { id: 'fx1', title: 'stat',     visible: true, focused: false, folded: false, weight: 1, createdAt: 1, lastFocusedAt: 1 },
    { id: 'fx2', title: 'kv',       visible: true, focused: false, folded: false, weight: 1, createdAt: 2, lastFocusedAt: 2 },
    { id: 'fx3', title: 'chart',    visible: true, focused: false, folded: false, weight: 1, createdAt: 3, lastFocusedAt: 3 },
    { id: 'fx4', title: 'timeline', visible: true, focused: false, folded: false, weight: 1, createdAt: 4, lastFocusedAt: 4 },
    { id: 'fx5', title: 'list',     visible: true, focused: false, folded: false, weight: 1, createdAt: 5, lastFocusedAt: 5 },
    { id: 'fx6', title: 'tags',     visible: true, focused: false, folded: false, weight: 1, createdAt: 6, lastFocusedAt: 6 },
  ];

  // Format big numbers
  function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }

  // ── DAG FONC — reactive specs ────────────────────────────────────
  let profileSpec = $state(PROFILE_OBSERVER);
  let jsonViewerData = $state(TAXONOMY_TREE);
  let speciesTableSpec = $state({
    title: 'Top espèces observées',
    striped: true,
    columns: [
      { key: 'icon', label: '' },
      { key: 'common', label: 'Nom commun' },
      { key: 'name', label: 'Nom scientifique' },
      { key: 'iconic', label: 'Groupe' },
      { key: 'count', label: 'Observations', align: 'right' as const, type: 'number' as const },
    ],
    rows: TOP_SPECIES.map(s => ({ icon: s.icon, common: s.common, name: s.name, iconic: s.iconic, count: s.count })),
  });

  let dagLastEvent = $state<{from: string, action: string, to: string} | null>(null);
  let dagHighlight = $state<string | null>(null);
  let dagBorderColor = $state<string | null>(null);

  const DAG = [
    { from: 'species-table',   action: 'rowclick',    targets: ['observer-profile', 'species-json'] },
    { from: 'observers-trombi', action: 'personclick', targets: ['observer-profile'] },
    { from: 'taxa-hemicycle',  action: 'groupclick',  targets: ['species-table'] },
    { from: 'species-cards',   action: 'cardclick',   targets: ['observer-profile'] },
  ];

  onMount(() => {
    try {
      initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true });
    } catch {}

    // Load demo skills and expose to state
    loadDemoSkills();
    refreshSkills();

    // DAG FONC router
    const unsubDag = bus.subscribe(['interact'], (msg) => {
      const { action, payload } = msg.payload as { type: string; action: string; payload: unknown };
      const row = payload as Record<string, unknown>;

      for (const edge of DAG) {
        if (msg.from === edge.from && action === edge.action) {
          for (const target of edge.targets) {
            if (target === 'observer-profile') {
              if (action === 'rowclick') profileSpec = speciesToProfile(row);
              else if (action === 'personclick') profileSpec = observerToProfile(row);
              else if (action === 'cardclick') profileSpec = speciesToProfile(row);
            } else if (target === 'species-json') {
              jsonViewerData = { selected: row } as typeof TAXONOMY_TREE;
            } else if (target === 'species-table') {
              speciesTableSpec = filterSpeciesByGroup(row, TOP_SPECIES);
            }
            dagLastEvent = { from: msg.from as string, action, to: target };
            dagHighlight = target;
            setTimeout(() => { if (dagHighlight === target) dagHighlight = null; }, 1500);
          }
        }
      }
    });

    const unsubColor = bus.subscribe(['color-update'], (msg) => {
      dagBorderColor = msg.payload as string;
    });

    const stopListening = listenForAgentCalls((name, args) => executeToolInternal(name, args));

    const mc = (navigator as unknown as Record<string, unknown>).modelContext as {
      registerTool: (t: unknown, opts?: unknown) => void;
      unregisterTool: (name: string) => void;
    } | undefined;

    const toolNames: string[] = [];

    function reg(tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      execute: (args?: Record<string, unknown>) => unknown;
      annotations?: Record<string, unknown>;
    }) {
      if (!mc) return;
      mc.registerTool(tool, { readOnlyHint: tool.annotations?.readOnlyHint ?? true });
      toolNames.push(tool.name);
    }

    // ── DATA TOOLS ──────────────────────────────────────────────────

    reg({
      name: 'showcase__describe',
      description: 'Décrit la page showcase complète : sections, composants disponibles, données mockées iNaturalist.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult({
        title: 'UI Showcase — webmcp-auto-ui',
        description: '32 composants Svelte 5 avec données iNaturalist mockées. Offline.',
        sections: [
          { id: 'primitives', label: 'Primitives', count: 5, components: ['Card', 'Panel', 'GridLayout', 'Window', 'List'] },
          { id: 'simple', label: 'Blocs simples', count: 9, components: ['StatBlock', 'KVBlock', 'ListBlock', 'ChartBlock', 'AlertBlock', 'CodeBlock', 'TextBlock', 'ActionsBlock', 'TagsBlock'] },
          { id: 'rich', label: 'Widgets riches', count: 13, components: ['StatCard', 'DataTable', 'Timeline', 'ProfileCard', 'Trombinoscope', 'Chart', 'Hemicycle', 'Cards', 'JsonViewer', 'GridData', 'Sankey', 'MapView', 'LogViewer'] },
          { id: 'wm', label: 'Window Manager', count: 5, components: ['TilingLayout', 'StackLayout', 'FloatingLayout', 'FlexLayout', 'Pane'] },
        ],
        data_source: 'iNaturalist mock (offline)',
        available_tools: ['showcase__describe', 'showcase__get_inat_stats', 'showcase__list_top_species', 'showcase__list_top_observers', 'showcase__list_iconic_taxa', 'showcase__get_monthly_obs', 'showcase__get_recent_obs', 'showcase__get_taxonomy', 'showcase__list_alerts', 'showcase__get_migration_flows', 'showcase__get_observer_profile', 'showcase__get_log_entries', 'showcase__get_grid_data'],
      }),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_inat_stats',
      description: 'Retourne les statistiques globales iNaturalist : total observations, research grade, espèces, observateurs, données France.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(INAT_STATS),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__list_top_species',
      description: 'Retourne les espèces les plus observées en France (jusqu\'à 8).',
      inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 8, description: 'Nombre d\'espèces à retourner (défaut: 8)' } } },
      execute: (args) => jsonResult(TOP_SPECIES.slice(0, (args?.limit as number) ?? 8)),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__list_top_observers',
      description: 'Retourne les meilleurs observateurs naturalistes français.',
      inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 6, description: 'Nombre d\'observateurs (défaut: 6)' } } },
      execute: (args) => jsonResult(TOP_OBSERVERS.slice(0, (args?.limit as number) ?? 6)),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__list_iconic_taxa',
      description: 'Retourne la répartition des observations par groupe taxonomique (Aves, Insecta, Plantae…).',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(ICONIC_TAXA),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_monthly_obs',
      description: 'Retourne les observations mensuelles sur 12 mois et les courbes multi-séries par groupe.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult({ monthly: MONTHLY_OBS, multi_series: MULTI_SERIES }),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_recent_obs',
      description: 'Retourne les observations récentes (taxon, lieu, date, qualité research grade).',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(RECENT_OBS),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_taxonomy',
      description: 'Retourne l\'arbre taxonomique (défaut: Parus major, taxon_id=14916).',
      inputSchema: { type: 'object', properties: { taxon_id: { type: 'integer', description: 'ID du taxon iNaturalist (défaut: 14916)' } } },
      execute: () => jsonResult(TAXONOMY_TREE),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__list_alerts',
      description: 'Retourne les alertes biodiversité actives.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(ALERTS),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_migration_flows',
      description: 'Retourne les flux migratoires observés (noeuds + liens pour Sankey).',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(MIGRATION_FLOWS),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_observer_profile',
      description: 'Retourne le profil détaillé de l\'observatrice #1 France.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(PROFILE_OBSERVER),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_log_entries',
      description: 'Retourne les entrées de log de l\'API iNaturalist.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(LOG_ENTRIES),
      annotations: { readOnlyHint: true },
    });

    reg({
      name: 'showcase__get_grid_data',
      description: 'Retourne les données grille (observations par groupe × mois).',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(GRID_DATA),
      annotations: { readOnlyHint: true },
    });

    // ── SKILLS ──────────────────────────────────────────────────────

    const SKILL_IDS = [
      'showcase-page',
      'showcase-inat-overview',
      'showcase-top-species',
      'showcase-top-observers',
      'showcase-monthly-seasonality',
      'showcase-biodiversity-hemicycle',
      'showcase-obs-timeline',
      'showcase-migration-sankey',
    ];

    registerSkill({
      id: 'showcase-page',
      name: 'Showcase Page',
      description: 'Page globale du showcase webmcp-auto-ui — 32 composants Svelte 5 avec données iNaturalist mockées.',
      component: 'apps/showcase/src/routes/+page.svelte',
      presentation: 'Sections: Primitives, Blocs simples, Widgets riches, Window Manager. Données offline.',
      tags: ['showcase', 'inat', 'overview'],
    });

    registerSkill({
      id: 'showcase-inat-overview',
      name: 'iNaturalist Overview',
      description: 'Stats globales iNaturalist (148M+ obs, 421k espèces, France 12M). Composants StatBlock + KVBlock.',
      component: 'StatBlock, KVBlock',
      presentation: 'section#simple · StatBlock label=Observations France + KVBlock Parus major',
      tags: ['showcase', 'inat', 'stats'],
    });

    registerSkill({
      id: 'showcase-top-species',
      name: 'Top Species Table',
      description: 'Tableau des 8 espèces les plus observées en France — DataTable triable par colonne.',
      component: 'DataTable',
      presentation: 'section#rich · DataTable striped, colonnes: icon, nom commun, nom scientifique, groupe, observations',
      tags: ['showcase', 'inat', 'species', 'datatable'],
    });

    registerSkill({
      id: 'showcase-top-observers',
      name: 'Top Observers Trombinoscope',
      description: 'Trombinoscope des 6 meilleurs naturalistes français avec avatars, badges et compteurs.',
      component: 'Trombinoscope',
      presentation: 'section#rich · Trombinoscope 6 colonnes, badges colorés',
      tags: ['showcase', 'inat', 'observers', 'trombinoscope'],
    });

    registerSkill({
      id: 'showcase-monthly-seasonality',
      name: 'Monthly Seasonality Charts',
      description: 'Saisonnalité des observations — Chart bar mensuel + Chart line multi-séries (Aves, Insecta, Plantae).',
      component: 'Chart',
      presentation: 'section#rich · Chart type=bar (répartition) + Chart type=line (multi-séries 12 mois)',
      tags: ['showcase', 'inat', 'chart', 'seasonality'],
    });

    registerSkill({
      id: 'showcase-biodiversity-hemicycle',
      name: 'Biodiversity Hemicycle',
      description: 'Répartition taxonomique en hémicycle — 8 groupes (Plantae 48, Aves 32, Insecta 28…) sur 100 sièges symboliques.',
      component: 'Hemicycle',
      presentation: 'section#rich · Hemicycle totalSeats=100, groupes colorés',
      tags: ['showcase', 'inat', 'hemicycle', 'taxonomy'],
    });

    registerSkill({
      id: 'showcase-obs-timeline',
      name: 'iNaturalist Observations Timeline',
      description: 'Historique iNaturalist 2024-2026 — jalons done/active/pending (120M, 148M, 200M obs).',
      component: 'Timeline',
      presentation: 'section#rich · Timeline 4 événements, statuts done/active/pending',
      tags: ['showcase', 'inat', 'timeline', 'history'],
    });

    registerSkill({
      id: 'showcase-migration-sankey',
      name: 'Migration Flows Sankey',
      description: 'Flux migratoires observés (Afrique → Europe → France) — diagramme Sankey avec noeuds et liens.',
      component: 'Sankey',
      presentation: 'section#rich · Sankey 5 noeuds (af, eu_s, eu_n, as, fr), 5 liens',
      tags: ['showcase', 'inat', 'sankey', 'migration'],
    });

    return () => {
      unsubDag?.();
      unsubColor?.();
      stopListening?.();
      toolNames.forEach(n => { try { mc?.unregisterTool(n); } catch {} });
      SKILL_IDS.forEach(id => { try { unregisterSkill(id); } catch {} });
      mcpClient = null;
    };
  });
</script>

<svelte:head><title>UI Showcase — webmcp-auto-ui × iNaturalist</title></svelte:head>

<div class="min-h-screen bg-bg font-sans flex">

  <!-- SIDEBAR NAV -->
  <nav class="w-52 border-r border-border bg-surface hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
    <div class="px-4 pt-5 pb-3">
      <div class="font-mono text-xs font-bold mb-0.5">
        <span class="text-white">webmcp</span><span class="text-accent">-auto-ui</span>
      </div>
      <div class="font-mono text-[10px] text-text2">UI Showcase</div>
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
            {active === s.id ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text2 hover:text-text1 hover:bg-white/5'}"
          onclick={() => scrollTo(s.id)}>
          {s.label}
          <span class="float-right text-[10px] opacity-50">{s.count}</span>
        </button>
      {/each}
    </div>

    <div class="px-4 py-4 border-t border-border text-[9px] font-mono text-text2">
      32 composants · Svelte 5<br/>
      données : iNaturalist mock<br/>
      <a href="https://hyperskills.net" target="_blank" class="text-accent hover:underline">hyperskills.net</a>
    </div>
  </nav>

  <!-- MAIN CONTENT -->
  <main class="flex-1 overflow-y-auto">

    <!-- HERO / TOPBAR -->
    <div class="border-b border-border bg-surface px-8 py-5 flex items-center gap-6 flex-wrap">
      <div class="flex-1 min-w-0">
        <h1 class="font-bold text-2xl mb-0.5"><span class="text-white">webmcp-auto-ui</span> <span class="text-accent">UI Showcase</span></h1>

      </div>
      <!-- MCP Connector -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <McpConnector
          url={mcpUrl}
          onurlchange={(v) => mcpUrl = v}
          connecting={mcpConnecting}
          connected={mcpConnected}
          serverName={mcpServerName}
          error={mcpError}
          onconnect={connectMcp}
          ondisconnect={disconnectMcp}
          compact
        />
        {#if mcpConnected}
          <button
            onclick={autoGenerate}
            disabled={autoGenerating}
            class="px-3 py-1.5 rounded text-xs font-mono border border-teal/30 bg-teal/10 text-teal hover:bg-teal/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {autoGenerating ? 'Génération…' : 'Auto-générer'}
          </button>
        {/if}
      </div>
      <!-- Demo MCP servers -->
      <div class="mt-3">
        <RemoteMCPserversDemo
          servers={MCP_DEMO_SERVERS}
          {connectedUrls}
          loading={loadingUrls}
          onconnect={connectDemoServer}
          ondisconnect={disconnectDemoServer}
        />
      </div>
    </div>

    {#if mcpTools.length > 0}
      <div class="border-b border-border bg-surface2 px-8 py-4">
        <div class="text-xs font-mono text-accent mb-2">MCP Tools ({mcpTools.length})</div>
        <div class="flex flex-wrap gap-2">
          {#each mcpTools as tool}
            <span class="text-[10px] font-mono bg-accent/10 text-accent px-2 py-1 rounded" title={tool.description}>{tool.name}</span>
          {/each}
        </div>
      </div>
    {/if}

    {#if autoBlocks.length > 0}
      <div class="border-b border-border bg-surface px-8 py-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-xs font-mono text-accent">Auto-generated UI</span>
          <span class="text-xs font-mono text-text2">({autoBlocks.length} blocks)</span>
          <button class="text-xs font-mono text-text2 hover:text-accent2 ml-auto" onclick={() => { autoBlocks = []; }}>clear</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each autoBlocks as block (block.id)}
            <BlockRenderer type={block.type} data={block.data} />
          {/each}
        </div>
      </div>
    {/if}

    <div class="px-8 py-10 flex flex-col gap-20">

      <!-- ── PRIMITIVES ── -->
      <section id="primitives">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-text1">Primitives</h2>
          <span class="text-xs font-mono text-text2 border border-border px-2 py-0.5 rounded">7 composants · briques atomiques</span>
        </div>
        <div class="grid grid-cols-2 gap-4">

          <div>
            <div class="text-xs font-mono text-text2 mb-2">Card · header + body + footer</div>
            <Card>
              {#snippet header()}<span class="text-xs font-mono text-text2">🌿 iNaturalist</span>{/snippet}
              <p class="text-sm text-text1">Observations mondiales : <strong class="text-white">{fmt(INAT_STATS.total_observations)}</strong></p>
              <p class="text-xs text-text2 mt-1">{fmt(INAT_STATS.species_count)} espèces documentées</p>
              {#snippet footer()}<span class="text-[10px] font-mono text-text2">Research Grade : {fmt(INAT_STATS.research_grade)}</span>{/snippet}
            </Card>
          </div>

          <div>
            <div class="text-xs font-mono text-text2 mb-2">Panel · titre + scroll interne</div>
            <Panel title="TOP ESPÈCES FRANCE">
              <List items={TOP_SPECIES.slice(0,4)} maxHeight="120px">
                {#snippet item(it)}
                  {@const sp = it as typeof TOP_SPECIES[0]}
                  <div class="flex items-center justify-between py-1.5 px-1 text-xs">
                    <span>{sp.icon} {sp.common}</span>
                    <span class="font-mono text-text2">{fmt(sp.count)}</span>
                  </div>
                {/snippet}
              </List>
            </Panel>
          </div>

          <div class="col-span-2">
            <div class="text-xs font-mono text-text2 mb-2">GridLayout · cols=3 gap=4</div>
            <GridLayout cols={3} gap={3}>
              {#each ICONIC_TAXA.slice(0,3) as t}
                <Card>
                  <div class="text-center py-2">
                    <div class="text-xs font-mono text-text2 mb-1">{t.label}</div>
                    <div class="text-xl font-bold" style="color:{t.color}">{t.seats}%</div>
                  </div>
                </Card>
              {/each}
            </GridLayout>
          </div>

          <div>
            <div class="text-xs font-mono text-text2 mb-2">Window · draggable=false</div>
            <Window title="Parus major — Great Tit">
              <div class="p-3 text-xs text-text2 font-mono space-y-1">
                <div>Ordre : Passeriformes</div>
                <div>Famille : Paridae</div>
                <div>Obs : {fmt(4_218_221)}</div>
                <div>Statut : LC (UICN)</div>
              </div>
            </Window>
          </div>

          <div>
            <div class="text-xs font-mono text-text2 mb-2">List · slot item personnalisé</div>
            <List items={TOP_OBSERVERS.slice(0,3)} class="bg-surface border border-border rounded-lg">
              {#snippet item(it)}
                {@const ob = it as typeof TOP_OBSERVERS[0]}
                <div class="flex items-center gap-2 px-3 py-2 text-xs">
                  <div class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style="background:{ob.color}">{ob.avatar}</div>
                  <span class="text-text1 flex-1">{ob.name}</span>
                  <span class="font-mono text-text2">{fmt(ob.obs)}</span>
                </div>
              {/snippet}
              {#snippet empty()}<div class="py-4 text-center text-text2 text-xs">Aucun observateur</div>{/snippet}
            </List>
          </div>

          <div>
            <div class="text-xs font-mono text-text2 mb-2">Tooltip · survol</div>
            <div class="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-3 items-center">
              {#each TOP_SPECIES.slice(0,4) as sp}
                <Tooltip content="{sp.name} · {fmt(sp.count)} obs">
                  <button class="flex items-center gap-1.5 px-2 py-1 rounded border border-border2 text-xs font-mono text-text1 hover:border-accent/50 transition-colors">
                    <span>{sp.icon}</span><span>{sp.common}</span>
                  </button>
                </Tooltip>
              {/each}
              <span class="text-[10px] text-text2 font-mono ml-2">← survolez</span>
            </div>
          </div>

          <div>
            <div class="text-xs font-mono text-text2 mb-2">Dialog · modale accessible</div>
            <div class="bg-surface border border-border rounded-lg p-4 flex items-center gap-4">
              <Dialog bind:open={dialogOpen}>
                <DialogTrigger>
                  <button class="px-3 py-1.5 rounded border border-accent text-accent text-xs font-mono hover:bg-accent/10 transition-colors">
                    Ouvrir dialog
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Parus major — Mésange charbonnière</DialogTitle>
                    <DialogDescription>Passeriformes · Paridae · UICN LC</DialogDescription>
                  </DialogHeader>
                  <div class="py-3 text-sm text-text2 space-y-2">
                    <p>Observations mondiales : <strong class="text-text1">{fmt(4_218_221)}</strong></p>
                    <p>Principale espèce observée en France sur iNaturalist depuis 2020.</p>
                  </div>
                  <DialogFooter>
                    <button onclick={() => dialogOpen = false} class="px-3 py-1.5 rounded border border-border2 text-xs font-mono text-text2 hover:text-text1 transition-colors">
                      Fermer
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <span class="text-[10px] text-text2 font-mono">bits-ui Dialog wrappé avec tokens design</span>
            </div>
          </div>

        </div>
      </section>

      <!-- ── BLOCS SIMPLES ── -->
      <section id="simple">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-text1">Blocs simples</h2>
          <span class="text-xs font-mono text-text2 border border-border px-2 py-0.5 rounded">9 blocs · PJ référence</span>
        </div>
        <div class="grid grid-cols-3 gap-4">

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">StatBlock</div>
            <StatBlock data={{ label: 'Observations France', value: fmt(INAT_STATS.france_observations), trend: '+18% vs 2025', trendDir: 'up' }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">KVBlock</div>
            <KVBlock data={{ title: 'Parus major', rows: [['Ordre','Passeriformes'],['Famille','Paridae'],['Statut','LC'],['Obs','4.2M']] }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">ListBlock</div>
            <ListBlock data={{ title: 'Espèces récentes', items: RECENT_OBS.map(o => `${o.common} · ${o.place}`) }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">ChartBlock</div>
            <ChartBlock data={{ title: 'Obs mensuelles (k)', bars: MONTHLY_OBS.map(([m, v]) => [m, Math.round((v as number)/1000)]) as [string,number][] }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">AlertBlock</div>
            <AlertBlock data={ALERTS[0]} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">CodeBlock</div>
            <CodeBlock data={{ lang: 'json', content: `{\n  "taxon": "Parus major",\n  "count": 4218221,\n  "status": "LC"\n}` }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">TextBlock</div>
            <TextBlock data={{ content: 'iNaturalist est un réseau social de naturalistes fondé en 2008. Avec 148M+ observations validées, c\'est la plus grande base de données de biodiversité citoyenne au monde.' }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">ActionsBlock</div>
            <ActionsBlock data={{ buttons: [{ label: 'Explorer', primary: true }, { label: 'Exporter CSV' }, { label: 'API docs' }] }} />
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2">TagsBlock</div>
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
          <h2 class="text-lg font-bold text-text1">Widgets riches</h2>
          <span class="text-xs font-mono text-text2 border border-border px-2 py-0.5 rounded">13 widgets · Archive</span>
        </div>

        <div class="flex items-center gap-2 mb-4">
          <span class="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">DAG FONC actif</span>
          {#if dagLastEvent}
            <span class="text-xs font-mono text-teal animate-pulse">
              {dagLastEvent.from} → {dagLastEvent.to}
            </span>
          {/if}
          <span class="text-xs font-mono text-text2">Cliquez sur un composant interactif</span>
          <span class="text-xs font-mono text-text2">Cliquez les carr&#233;s de couleur pour propager le style</span>
        </div>

        <div class="flex flex-col gap-6">

          <!-- Row 1: StatCard x3 -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">StatCard — 3 variants</div>
            <div class="grid grid-cols-3 gap-4">
              <StatCard spec={{ label: 'Observations totales', value: '148M+', variant: 'default', trend: 'up', delta: '+12M en 2026' }} />
              <StatCard spec={{ label: 'Research Grade', value: '89.2M', variant: 'success', delta: '60% du total' }} />
              <StatCard spec={{ label: 'Espèces menacées', value: '4 218', variant: 'error', trend: 'down', delta: '-2% UICN' }} />
            </div>
          </div>

          <!-- DataTable (DAG node: species-table) -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">DataTable — tri par colonne, striped · <span class="text-accent">DAG: species-table</span></div>
            <div class="relative transition-all duration-300 rounded-lg {dagHighlight === 'species-table' ? 'ring-2 ring-accent shadow-lg shadow-accent/20' : ''}" style={dagBorderColor ? `border: 2px solid ${dagBorderColor}` : ''}>
              <div class="absolute top-2 right-2 flex gap-1 z-10">
                {#each ['#7c6dfa', '#3ecfb2', '#f0a050', '#fa6d7c', '#3b82f6'] as color}
                  <button class="w-3 h-3 rounded-sm border border-border2 hover:scale-125 transition-transform cursor-pointer" style="background: {color}" onclick={() => bus.broadcast('showcase', 'color-update', color)}></button>
                {/each}
              </div>
              <BlockRenderer id="species-table" type="data-table" data={speciesTableSpec} />
            </div>
          </div>

          <!-- Timeline + ProfileCard -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-mono text-text2 mb-3">Timeline — statuts done/active/pending</div>
              <Timeline spec={{ title: 'Historique iNaturalist', events: OBS_TIMELINE }} />
            </div>
            <div>
              <div class="text-xs font-mono text-text2 mb-3">ProfileCard — observatrice #1 France · <span class="text-accent">DAG: observer-profile</span></div>
              <div class="relative transition-all duration-300 rounded-lg {dagHighlight === 'observer-profile' ? 'ring-2 ring-accent shadow-lg shadow-accent/20' : ''}" style={dagBorderColor ? `border: 2px solid ${dagBorderColor}` : ''}>
                <div class="absolute top-2 right-2 flex gap-1 z-10">
                  {#each ['#7c6dfa', '#3ecfb2', '#f0a050', '#fa6d7c', '#3b82f6'] as color}
                    <button class="w-3 h-3 rounded-sm border border-border2 hover:scale-125 transition-transform cursor-pointer" style="background: {color}" onclick={() => bus.broadcast('showcase', 'color-update', color)}></button>
                  {/each}
                </div>
                <BlockRenderer id="observer-profile" type="profile" data={profileSpec} />
              </div>
            </div>
          </div>

          <!-- Trombinoscope (DAG node: observers-trombi) -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">Trombinoscope — top observateurs · <span class="text-accent">DAG: observers-trombi</span></div>
            <div class="relative transition-all duration-300 rounded-lg" style={dagBorderColor ? `border: 2px solid ${dagBorderColor}` : ''}>
              <div class="absolute top-2 right-2 flex gap-1 z-10">
                {#each ['#7c6dfa', '#3ecfb2', '#f0a050', '#fa6d7c', '#3b82f6'] as color}
                  <button class="w-3 h-3 rounded-sm border border-border2 hover:scale-125 transition-transform cursor-pointer" style="background: {color}" onclick={() => bus.broadcast('showcase', 'color-update', color)}></button>
                {/each}
              </div>
              <BlockRenderer id="observers-trombi" type="trombinoscope" data={{
                title: 'Top observateurs France',
                columns: 6,
                people: TOP_OBSERVERS.map(o => ({ name: o.name, subtitle: fmt(o.obs) + ' obs', badge: o.badge, color: o.color })),
              }} />
            </div>
          </div>

          <!-- Chart: bar + line + pie -->
          <div class="grid grid-cols-3 gap-4">
            <div>
              <div class="text-xs font-mono text-text2 mb-3">Chart — bar</div>
              <Chart spec={{
                title: 'Répartition par groupe',
                type: 'bar',
                labels: ICONIC_TAXA.map(t => t.label),
                data: [{ values: ICONIC_TAXA.map(t => t.seats), color: '#7c6dfa' }],
              }} />
            </div>
            <div>
              <div class="text-xs font-mono text-text2 mb-3">Chart — line multi-séries</div>
              <Chart spec={{
                title: 'Obs mensuelles par groupe',
                type: 'line',
                labels: MULTI_SERIES.labels,
                data: MULTI_SERIES.datasets,
                legend: true,
              }} />
            </div>
            <div>
              <div class="text-xs font-mono text-text2 mb-3">Chart — donut</div>
              <Chart spec={{
                title: 'Groupes taxonomiques',
                type: 'donut',
                labels: ICONIC_TAXA.map(t => t.label),
                data: [{ values: ICONIC_TAXA.map(t => t.seats), color: '#7c6dfa' }],
              }} />
            </div>
          </div>

          <!-- Hemicycle (DAG node: taxa-hemicycle) -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">Hemicycle — répartition ordres taxonomiques (100 sièges symboliques) · <span class="text-accent">DAG: taxa-hemicycle</span></div>
            <div class="relative transition-all duration-300 rounded-lg" style={dagBorderColor ? `border: 2px solid ${dagBorderColor}` : ''}>
              <div class="absolute top-2 right-2 flex gap-1 z-10">
                {#each ['#7c6dfa', '#3ecfb2', '#f0a050', '#fa6d7c', '#3b82f6'] as color}
                  <button class="w-3 h-3 rounded-sm border border-border2 hover:scale-125 transition-transform cursor-pointer" style="background: {color}" onclick={() => bus.broadcast('showcase', 'color-update', color)}></button>
                {/each}
              </div>
              <BlockRenderer id="taxa-hemicycle" type="hemicycle" data={{ title: 'Biodiversité observée en France', groups: ICONIC_TAXA, totalSeats: 100 }} />
            </div>
          </div>

          <!-- Cards (DAG node: species-cards) -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">Cards — espèces remarquables · <span class="text-accent">DAG: species-cards</span></div>
            <div class="relative transition-all duration-300 rounded-lg" style={dagBorderColor ? `border: 2px solid ${dagBorderColor}` : ''}>
              <div class="absolute top-2 right-2 flex gap-1 z-10">
                {#each ['#7c6dfa', '#3ecfb2', '#f0a050', '#fa6d7c', '#3b82f6'] as color}
                  <button class="w-3 h-3 rounded-sm border border-border2 hover:scale-125 transition-transform cursor-pointer" style="background: {color}" onclick={() => bus.broadcast('showcase', 'color-update', color)}></button>
                {/each}
              </div>
              <BlockRenderer id="species-cards" type="cards" data={{
                title: 'Esp\u00e8ces remarquables',
                cards: TOP_SPECIES.slice(0,4).map(s => ({
                  title: s.icon + ' ' + s.common,
                  subtitle: s.name,
                  description: `${fmt(s.count)} observations · ${s.iconic}`,
                  tags: [s.iconic],
                  _raw: s,
                })),
              }} />
            </div>
          </div>

          <!-- JsonViewer + GridData -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-mono text-text2 mb-3">JsonViewer — réponse API taxon · <span class="text-accent">DAG: species-json</span></div>
              <div class="relative transition-all duration-300 rounded-lg {dagHighlight === 'species-json' ? 'ring-2 ring-accent shadow-lg shadow-accent/20' : ''}" style={dagBorderColor ? `border: 2px solid ${dagBorderColor}` : ''}>
                <div class="absolute top-2 right-2 flex gap-1 z-10">
                  {#each ['#7c6dfa', '#3ecfb2', '#f0a050', '#fa6d7c', '#3b82f6'] as color}
                    <button class="w-3 h-3 rounded-sm border border-border2 hover:scale-125 transition-transform cursor-pointer" style="background: {color}" onclick={() => bus.broadcast('showcase', 'color-update', color)}></button>
                  {/each}
                </div>
                <BlockRenderer id="species-json" type="json-viewer" data={{ title: '/v1/taxa/14916', data: jsonViewerData, maxDepth: 2 }} />
              </div>
            </div>
            <div>
              <div class="text-xs font-mono text-text2 mb-3">GridData — obs par groupe × mois</div>
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
              <div class="text-xs font-mono text-text2 mb-3">Sankey — flux migratoires (milliers d'obs)</div>
              <Sankey spec={{ title: 'Flux migratoires observés', nodes: MIGRATION_FLOWS.nodes, links: MIGRATION_FLOWS.links }} />
            </div>
            <div>
              <div class="text-xs font-mono text-text2 mb-3">MapView — placeholder (Leaflet requis)</div>
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
            <div class="text-xs font-mono text-text2 mb-3">LogViewer — flux API iNaturalist</div>
            <LogViewer spec={{ title: 'api.inaturalist.org · logs', entries: LOG_ENTRIES, maxHeight: '180px' }} />
          </div>

        </div>
      </section>

      <!-- ── GALLERY & CAROUSEL ── -->
      <section id="gallery">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-text1">Gallery & Carousel</h2>
          <span class="text-xs font-mono text-text2 border border-border px-2 py-0.5 rounded">2 composants · médias naturalistes</span>
        </div>
        <div class="flex flex-col gap-6">

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2 pb-1">Gallery — observations iNaturalist · lightbox intégré</div>
            <div class="p-3">
              <Gallery spec={{
                title: 'Observations naturalistes récentes',
                columns: 3,
                images: GALLERY_IMAGES,
              }} />
            </div>
          </div>

          <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div class="text-[10px] font-mono text-text2 px-3 pt-2 pb-1">Carousel — faits iNaturalist · défilement auto 5s</div>
            <div class="p-3">
              <Carousel spec={{
                title: 'iNaturalist — Science participative',
                slides: CAROUSEL_SLIDES,
                autoPlay: true,
                interval: 5000,
              }} />
            </div>
          </div>

        </div>
      </section>

      <!-- ── D3 VISUALIZATIONS ── -->
      <section id="d3">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-text1">D3 Visualizations</h2>
          <span class="text-xs font-mono text-text2 border border-border px-2 py-0.5 rounded">3 presets</span>
        </div>
        <div class="flex flex-col gap-6">

          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-mono text-text2 mb-3">Hex Heatmap</div>
              <BlockRenderer type="d3" data={{
                title: 'Observation Activity',
                preset: 'hex-heatmap',
                data: {
                  values: [
                    [0,2,4,1,3,5,2], [1,0,3,2,4,1,5], [3,2,1,4,0,3,2],
                    [2,5,3,1,2,4,0], [4,1,2,3,5,0,1], [1,3,0,2,1,4,3],
                    [0,2,4,5,3,1,2]
                  ]
                },
                config: { cellSize: 16, colorScale: ['#f0f0f6', '#6c5ce7'] }
              }} />
            </div>
            <div>
              <div class="text-xs font-mono text-text2 mb-3">Radial Chart</div>
              <BlockRenderer type="d3" data={{
                title: 'Observations by Taxon',
                preset: 'radial',
                data: {
                  segments: [
                    { label: 'Plantae', value: 48, color: '#22c55e' },
                    { label: 'Aves', value: 32, color: '#3b82f6' },
                    { label: 'Insecta', value: 28, color: '#f0a050' },
                    { label: 'Fungi', value: 15, color: '#a855f7' },
                    { label: 'Mammalia', value: 12, color: '#fa6d7c' },
                  ]
                },
                config: { innerRadius: 0.4 }
              }} />
            </div>
          </div>

          <div>
            <div class="text-xs font-mono text-text2 mb-3">Force Graph</div>
            <BlockRenderer type="d3" data={{
              title: 'Species Interaction Network',
              preset: 'force',
              data: {
                nodes: [
                  { id: 'parus', label: 'Parus major', group: 1 },
                  { id: 'quercus', label: 'Quercus robur', group: 2 },
                  { id: 'erithacus', label: 'Erithacus rubecula', group: 1 },
                  { id: 'betula', label: 'Betula pendula', group: 2 },
                  { id: 'pieris', label: 'Pieris brassicae', group: 3 },
                  { id: 'brassica', label: 'Brassica napus', group: 2 },
                ],
                links: [
                  { source: 'parus', target: 'quercus', value: 5 },
                  { source: 'parus', target: 'erithacus', value: 3 },
                  { source: 'erithacus', target: 'betula', value: 2 },
                  { source: 'pieris', target: 'brassica', value: 4 },
                  { source: 'parus', target: 'pieris', value: 1 },
                ]
              }
            }} />
          </div>

        </div>
      </section>

      <!-- ── RECETTES CRUD ── -->
      <section id="skills">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-text1">Recettes (Skills) CRUD</h2>
          <span class="text-xs font-mono text-text2 border border-border px-2 py-0.5 rounded">{skills.length} recette{skills.length !== 1 ? 's' : ''} · SDK registry</span>
        </div>

        <!-- Create form -->
        <div class="bg-surface border border-border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-all">
          <div class="text-xs font-mono text-text2 mb-3">Nouvelle recette</div>
          <div class="flex gap-2 flex-wrap">
            <input
              type="text"
              bind:value={newSkillName}
              placeholder="Nom de la recette…"
              class="flex-1 min-w-36 bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-text1 placeholder:text-text2 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <input
              type="text"
              bind:value={newSkillDesc}
              placeholder="Description (optionnel)…"
              class="flex-[2] min-w-48 bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-text1 placeholder:text-text2 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <button
              onclick={handleCreateSkill}
              disabled={!newSkillName.trim()}
              class="px-4 py-1.5 rounded text-xs font-mono bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Créer
            </button>
          </div>
        </div>

        <!-- Skills list -->
        <div class="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
          {#if skills.length === 0}
            <div class="p-6 text-center text-text2 text-xs font-mono">Aucune recette enregistrée</div>
          {:else}
            <div class="divide-y divide-border">
              {#each skills as skill (skill.id)}
                <div class="px-4 py-3 flex items-start gap-3 hover:bg-white/2 transition-all">
                  {#if editingId === skill.id}
                    <div class="flex-1 flex gap-2 flex-wrap items-center">
                      <input
                        type="text"
                        bind:value={editingName}
                        class="flex-1 min-w-32 bg-bg border border-accent/30 rounded px-2 py-1 text-xs font-mono text-text1 focus:outline-none"
                      />
                      <input
                        type="text"
                        bind:value={editingDesc}
                        class="flex-[2] min-w-40 bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-text2 focus:outline-none"
                      />
                      <div class="flex gap-1">
                        <button onclick={handleUpdateSkill} class="px-2 py-1 text-[10px] font-mono bg-teal/10 border border-teal/30 text-teal rounded hover:bg-teal/20 transition-all">Sauver</button>
                        <button onclick={cancelEdit} class="px-2 py-1 text-[10px] font-mono bg-zinc-800 border border-border text-text2 rounded hover:bg-zinc-700 transition-all">Annuler</button>
                      </div>
                    </div>
                  {:else}
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-mono text-text1 truncate">{skill.name}</div>
                      {#if skill.description}
                        <div class="text-[10px] text-text2 mt-0.5 truncate">{skill.description}</div>
                      {/if}
                      {#if skill.tags?.length}
                        <div class="flex gap-1 mt-1 flex-wrap">
                          {#each skill.tags as tag}
                            <span class="text-[9px] font-mono bg-accent/10 text-accent/70 px-1.5 py-0.5 rounded">{tag}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    <div class="flex gap-1 flex-shrink-0">
                      <button onclick={() => startEdit(skill)} class="px-2 py-1 text-[10px] font-mono bg-zinc-800 border border-border text-text2 rounded hover:border-accent/30 hover:text-accent transition-all">Éditer</button>
                      <button onclick={() => handleDeleteSkill(skill.id)} class="px-2 py-1 text-[10px] font-mono bg-zinc-800 border border-border text-text2 rounded hover:border-red-500/30 hover:text-red-400 transition-all">Suppr.</button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </section>

      <!-- ── WINDOW MANAGER ── -->
      <section id="wm">
        <div class="flex items-center gap-3 mb-6">
          <h2 class="text-lg font-bold text-text1">Window Manager</h2>
          <span class="text-xs font-mono text-text2 border border-border px-2 py-0.5 rounded">6 layouts · Pane + TilingLayout + StackLayout + FloatingLayout + FlexLayout</span>
        </div>
        <div class="flex flex-col gap-6">

          <!-- TilingLayout -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">TilingLayout — Fibonacci spiral, 3 panes</div>
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
            <div class="text-xs font-mono text-text2 mb-3">StackLayout — mode scroll, poids proportionnels</div>
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

          <!-- FloatingLayout -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">FloatingLayout — fenêtres draggables librement</div>
            <div class="h-80 border border-border rounded-xl overflow-hidden bg-bg">
              <FloatingLayout windows={WM_WINDOWS} defaultWidth={220} defaultHeight={140}>
                {#snippet children(win, _lw, ctx)}
                  <Pane id={win.id} title={win.title} onfold={() => {}} onclose={() => {}} ondragstart={(e) => ctx.ondragstart(e)}>
                    {#if win.id === 'w1'}
                      <StatBlock data={{ label: 'Observations', value: '148M+', trend: '+12%', trendDir: 'up' }} />
                    {:else if win.id === 'w2'}
                      <ChartBlock data={{ title: 'Mensuel', bars: MONTHLY_OBS.slice(0,6).map(([m,v]) => [m, Math.round((v as number)/1000)]) as [string,number][] }} />
                    {:else}
                      <KVBlock data={{ title: 'Parus major', rows: [['Famille','Paridae'],['Statut','LC']] }} />
                    {/if}
                  </Pane>
                {/snippet}
              </FloatingLayout>
            </div>
            <p class="text-[10px] font-mono text-text2 mt-2">← glissez les fenêtres pour les repositionner</p>
          </div>

          <!-- FlexLayout -->
          <div>
            <div class="text-xs font-mono text-text2 mb-3">FlexLayout — auto-grid responsive avec slider de taille</div>
            <div class="h-[500px] border border-border rounded-xl overflow-hidden bg-bg">
              <FlexLayout windows={FLEX_WINDOWS} minWidth={260} maxWidth={600}>
                {#snippet children(win, _lw, _ctx)}
                  <div class="bg-surface border border-border rounded-lg p-3 h-full overflow-auto">
                    <div class="text-xs font-mono text-text2 mb-2">{win.title}</div>
                    {#if win.id === 'fx1'}
                      <StatBlock data={{ label: 'Observations France', value: fmt(INAT_STATS.france.total), trend: '+8%', trendDir: 'up' }} />
                    {:else if win.id === 'fx2'}
                      <KVBlock data={{ title: 'Parus major', rows: [['Famille','Paridae'],['Ordre','Passeriformes'],['Statut IUCN','LC'],['Obs. France','842 301']] }} />
                    {:else if win.id === 'fx3'}
                      <ChartBlock data={{ title: 'Saisonnalité', bars: MONTHLY_OBS.slice(0,6).map(([m,v]) => [m, Math.round((v as number)/1000)]) as [string,number][] }} />
                    {:else if win.id === 'fx4'}
                      <Timeline events={OBS_TIMELINE} />
                    {:else if win.id === 'fx5'}
                      <ListBlock data={{ title: 'Top espèces', items: TOP_SPECIES.slice(0,5).map(s => `${s.icon} ${s.common} — ${fmt(s.count)} obs`) }} />
                    {:else}
                      <TagsBlock data={{ label: 'Groupes taxonomiques', tags: ICONIC_TAXA.slice(0,6).map(t => ({ text: `${t.label} (${t.seats})` })) }} />
                    {/if}
                  </div>
                {/snippet}
              </FlexLayout>
            </div>
            <p class="text-[10px] font-mono text-text2 mt-2">← utilisez le slider en haut à droite pour ajuster la taille des cellules</p>
          </div>

        </div>
      </section>

    </div><!-- end main content -->
  </main>
</div>
