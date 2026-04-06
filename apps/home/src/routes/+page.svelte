<script lang="ts">
  import { PUBLIC_BASE_URL } from '$env/static/public';

  const base = PUBLIC_BASE_URL ?? '';

  const demos = [
    {
      title: 'Composer',
      desc: 'Build UIs with 3 modes: auto (LLM generates from MCP data), drag & drop, or chat. Supports Claude and Gemma (local WASM). Full recipe CRUD, theme support, and HyperSkills URL export.',
      url: `${base}/composer`,
      accent: '#7c6dfa',
    },
    {
      title: 'Viewer',
      desc: 'Load any HyperSkills URL (?hs=), render its blocks, edit inline, diff versions with SHA-256 traceability. Auto-generate UI from a connected MCP server.',
      url: `${base}/viewer`,
      accent: '#f0a050',
    },
    {
      title: 'Showcase',
      desc: '34 components demonstrated with iNaturalist data. Interactive DAG wiring via FONC bus — click a table row and watch other components update in real-time. Gallery, Carousel, D3 visualizations.',
      url: `${base}/showcase`,
      accent: '#22c55e',
    },
    {
      title: 'Mobile',
      desc: 'Responsive chat agent with MCP integration, Gemma WASM local model, recipe management, and native sharing (Web Share API, email, social). Phone frame on desktop, full-screen on mobile.',
      url: `${base}/mobile`,
      accent: '#fa6d7c',
    },
    {
      title: 'Todo',
      desc: 'Minimal WebMCP demo — a todo list that exposes 8 tools (add, list, toggle, delete...) callable by any AI agent or Chrome extension via the W3C WebMCP protocol.',
      url: `${base}/todo`,
      accent: '#3ecfb2',
    },
  ];
</script>

<svelte:head>
  <title>HyperSkills Demos</title>
</svelte:head>

<div class="min-h-screen bg-bg font-sans">
  <div class="max-w-3xl mx-auto px-6 py-16 md:py-24">

    <header class="mb-12 md:mb-16">
      <h1 class="text-3xl md:text-4xl font-bold text-text1 mb-3">
        <span>Hyper</span><span class="text-accent">Skills</span>
        <span class="text-text2 font-normal text-lg md:text-xl ml-2">Demos</span>
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

    <footer class="mt-16 pt-6 border-t border-border text-xs font-mono text-text2 flex flex-wrap gap-x-4 gap-y-1">
      <span>webmcp-auto-ui</span>
      <span>AGPL-3.0</span>
      <span>Svelte 5 + Tailwind</span>
      <span>W3C WebMCP Draft 2026-03-27</span>
    </footer>
  </div>
</div>
