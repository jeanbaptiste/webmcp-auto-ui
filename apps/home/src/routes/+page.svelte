<script lang="ts">
  declare const __BUILD_TIME__: string;
  import { PUBLIC_BASE_URL } from '$env/static/public';

  const base = PUBLIC_BASE_URL ?? '';

  const demos = [
    {
      title: 'Flex',
      desc: 'Canvas drag & resize avec multi-MCP (7 serveurs simultanés), chat éphémère, export HyperSkills, et Gemma WASM local. Le plus complet des démos.',
      url: `${base}/flex`,
      accent: '#06b6d4',
    },
{
      title: 'Showcase',
      desc: '34 components demonstrated with iNaturalist data. Interactive DAG wiring via FONC bus — click a table row and watch other components update in real-time. Gallery, Carousel, D3 visualizations.',
      url: `${base}/showcase`,
      accent: '#22c55e',
    },
    {
      title: 'Todo',
      desc: 'Minimal WebMCP demo — a todo list that exposes 8 tools (add, list, toggle, delete...) callable by any AI agent or Chrome extension via the W3C WebMCP protocol.',
      url: `${base}/todo`,
      accent: '#3ecfb2',
    },
{
      title: 'Viewer',
      desc: 'Load any HyperSkills URL (?hs=), render its blocks, edit inline, diff versions with SHA-256 traceability. Auto-generate UI from a connected MCP server.',
      url: `${base}/viewer`,
      accent: '#f0a050',
    },
  ];

  const mcpServers = [
    { name: 'Code4Code', desc: 'Parlement français' },
    { name: 'Hacker News', desc: 'Stories & commentaires' },
    { name: 'Met Museum', desc: 'Collections d\'art' },
    { name: 'Open-Meteo', desc: 'Données météo' },
    { name: 'Wikipedia', desc: 'Articles & recherche' },
    { name: 'iNaturalist', desc: 'Biodiversité' },
    { name: 'data.gouv.fr', desc: 'Open data FR' },
  ];
</script>

<svelte:head>
  <title>WEBMCP Auto-UI</title>
</svelte:head>

<div class="min-h-screen bg-bg font-sans">
  <div class="max-w-3xl mx-auto px-6 py-16 md:py-24">

    <header class="mb-12 md:mb-16">
      <h1 class="text-3xl md:text-4xl font-bold text-text1 mb-3">
        <span>WEBMCP</span> <span class="text-accent">Auto-UI</span>
      </h1>
      <p class="text-text2 text-sm md:text-base leading-relaxed max-w-xl">
        Interactive demos of the webmcp-auto-ui framework — Svelte 5 components,
        W3C WebMCP protocol, AI-driven UI composition, and portable HyperSkills URLs.
      </p>
      <div class="flex gap-4 mt-4">
        <a href="https://hyperskills.net" target="_blank" class="text-xs font-mono text-accent hover:underline">hyperskills.net</a>
        <a href="https://github.com/jeanbaptiste/webmcp-auto-ui" target="_blank" class="text-xs font-mono text-text2 hover:text-accent">GitHub</a>
      </div>
    </header>

    <div class="flex flex-col gap-4">
      {#each demos as demo}
        <a href={demo.url}
          class="block bg-surface border border-border rounded-xl p-5 md:p-6 hover:border-border2 hover:shadow-lg transition-all group">
          <div class="flex items-start gap-4">
            <div class="w-1.5 h-10 rounded-full flex-shrink-0 mt-0.5" style="background: {demo.accent}"></div>
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold text-text1 group-hover:text-accent transition-colors">{demo.title}</h2>
              <p class="text-sm text-text2 mt-1 leading-relaxed">{demo.desc}</p>
              <span class="inline-block mt-3 text-xs font-mono text-accent/70 group-hover:text-accent transition-colors">{demo.url.replace(base, '')} &rarr;</span>
            </div>
          </div>
        </a>
      {/each}
    </div>

    <div class="mt-10 border border-border rounded-xl p-5">
      <div class="text-[10px] font-mono text-text2 uppercase tracking-wider mb-3">Serveurs MCP disponibles</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        {#each mcpServers as srv}
          <div class="text-xs font-mono text-text1 bg-surface2 rounded-lg px-3 py-2">
            <div class="font-medium">{srv.name}</div>
            <div class="text-[10px] text-text2 truncate">{srv.desc}</div>
          </div>
        {/each}
      </div>
    </div>

    <footer class="mt-16 pt-6 border-t border-border text-xs font-mono text-text2 flex flex-wrap gap-x-4 gap-y-1">
      <span>webmcp-auto-ui</span>
      <span>AGPL-3.0</span>
      <span>{__BUILD_TIME__?.slice(0, 10)}</span>
    </footer>
  </div>
</div>
