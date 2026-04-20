<script lang="ts">
  declare const __BUILD_TIME__: string;
  declare const __GIT_HASH__: string;
  import { PUBLIC_BASE_URL } from '$env/static/public';
  import { getTheme } from '../../../../packages/ui/src/theme/ThemeProvider.svelte';

  const theme = getTheme();

  const base = PUBLIC_BASE_URL ?? '';

  const demos = [
    {
      title: 'Flex',
      desc: 'WebMCP multi-server, widgets, recipes, lazy loading, debug panel.',
      url: `${base}/flex`,
      accent: '#8b5cf6',
    },
    {
      title: 'Viewer',
      desc: 'Read-only HyperSkills viewer. Decodes and renders widgets, with an Edit button to open in Flex.',
      url: `${base}/viewer`,
      accent: '#f59e0b',
    },
    {
      title: 'Showcase',
      desc: 'Dynamic showcase of all UI components with 3 themes (corporate, pastel, cyberpunk).',
      url: `${base}/showcase`,
      accent: '#10b981',
    },
    {
      title: 'Todo-WebMCP',
      desc: 'Minimal reference template to bootstrap a webmcp-auto-ui app.',
      url: `${base}/todo`,
      accent: '#14b8a6',
    },
    {
      title: 'Recipes',
      desc: 'MCP and WebMCP recipe explorer. Connect servers, browse recipes, and test them live.',
      url: `${base}/recipes`,
      accent: '#ec4899',
    },
    {
      title: 'Boilerplate',
      desc: 'Svelte integration template + 3 custom Tricoteuses widgets. Starting point for your project.',
      url: `${base}/boilerplate`,
      accent: '#e11d48',
    },
  ];

  const mcpServers = [
    { name: 'Tricoteuses', desc: 'French Parliament' },
    { name: 'Hacker News', desc: 'Stories & comments' },
    { name: 'Met Museum', desc: 'Art collections' },
    { name: 'Open-Meteo', desc: 'Weather data' },
    { name: 'Wikipedia', desc: 'Articles & search' },
    { name: 'iNaturalist', desc: 'Biodiversity' },
    { name: 'data.gouv.fr', desc: 'French open data' },
    { name: 'NASA', desc: 'Space data' },
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
        <button onclick={theme.toggle} class="text-xs font-mono text-text2 hover:text-accent cursor-pointer" title="Toggle dark/light mode">{theme.mode === 'dark' ? '☀' : '☾'}</button>
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
      <div class="text-[10px] font-mono text-text2 uppercase tracking-wider mb-3">Available MCP servers</div>
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
      <span>v1.0.0 · {__GIT_HASH__ ?? ''} · {__BUILD_TIME__?.replace('T', ' ').replace('Z', '').slice(0, 23)}</span>
    </footer>
  </div>
</div>
