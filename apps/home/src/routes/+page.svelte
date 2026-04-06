<script lang="ts">
  import {
    StatCard, Timeline, Cards, DataTable, TagsBlock, AlertBlock,
    Trombinoscope, Chart, ProfileCard,
  } from '@webmcp-auto-ui/ui';

  const apps = [
    {
      title: 'HyperSkill Composer',
      url: '/composer',
      desc: '3-mode UI composer: auto (LLM), drag & drop, chat. Each canvas block auto-registers 3 WebMCP tools.',
      color: '#7c6dfa',
      tools: ['get_composer_info','list_canvas_blocks','get_hyperskill_url','list_skills','clear_canvas','block_*_get','block_*_update','block_*_remove'],
      badge: '5 + 3×N tools',
    },
    {
      title: 'Todo — WebMCP Demo',
      url: '/todo',
      desc: 'Pure WebMCP todo list — every operation is a callable tool for any agent or Chrome extension.',
      color: '#3ecfb2',
      tools: ['add_todo','list_todos','get_todo','toggle_todo','update_todo','delete_todo','clear_done_todos','get_todo_stats'],
      badge: '8 tools WebMCP',
    },
    {
      title: 'HyperSkill Viewer',
      url: '/viewer',
      desc: 'Load, display and edit HyperSkills from a ?hs= URL with SHA-256 diff and version chaining.',
      color: '#f0a050',
      tools: ['get_hyperskill_info','load_hyperskill','list_viewer_blocks','auto_generate_ui'],
      badge: '4 tools WebMCP',
    },
    {
      title: 'UI Showcase',
      url: '/showcase',
      desc: '32 components demonstrated with iNaturalist mock data — works fully offline.',
      color: '#22c55e',
      tools: ['offline · no MCP required'],
      badge: '32 components',
    },
    {
      title: 'HyperSkill Mobile',
      url: '/mobile',
      desc: 'Phone-frame UI with real MCP connection, agent loop, full skills CRUD and ?hs= URL loading.',
      color: '#fa6d7c',
      tools: ['mobile_get_info','mobile_list_skills','mobile_apply_skill','mobile_get_hyperskill_url'],
      badge: '4 tools WebMCP',
    },
  ];

  const totalTools = apps.reduce((n, a) => n + a.tools.filter(t => !t.startsWith('offline')).length, 0);

  const timelineEvents = [
    { date: 'Step 1', title: 'Enable WebMCP',        description: 'chrome://flags/#enable-webmcp-testing',              status: 'done'    as const },
    { date: 'Step 2', title: 'Install extension',    description: 'Model Context Tool Inspector — Chrome Web Store',    status: 'active'  as const },
    { date: 'Step 3', title: 'Open any app',         description: 'demos.hyperskills.net/composer · /todo · /viewer…', status: 'pending' as const },
    { date: 'Step 4', title: 'Inspect tools',        description: 'Click extension → tools appear live',               status: 'pending' as const },
  ];

  const packages = [
    {
      title: '@webmcp-auto-ui/core',
      description: 'W3C WebMCP polyfill · McpClient · sanitizeSchema · createToolGroup · listenForAgentCalls',
      tags: ['TypeScript', 'zero deps'],
    },
    {
      title: '@webmcp-auto-ui/ui',
      description: '5 primitives · 9 simple blocks · 13 rich widgets · 4 WM layouts — all Svelte 5 runes',
      tags: ['Svelte 5', 'Tailwind'],
    },
    {
      title: '@webmcp-auto-ui/agent',
      description: 'Agent loop · AnthropicProvider (proxy) · GemmaProvider (WebGPU worker) · 19 render_* UI tools',
      tags: ['Anthropic', 'Gemma E2B'],
    },
    {
      title: '@webmcp-auto-ui/sdk',
      description: 'HyperSkill format (SHA-256, gzip, ?hs=) · Skills CRUD · canvas store (Svelte 5 runes)',
      tags: ['HyperSkill', 'SHA-256'],
    },
  ];

  const components = [
    { name: 'Primitives',   count: '5',  items: 'Card · Panel · GridLayout · List · Window',                                       color: '#7c6dfa' },
    { name: 'Simple blocks',count: '9',  items: 'StatBlock · KVBlock · ListBlock · ChartBlock · AlertBlock · CodeBlock · TextBlock · ActionsBlock · TagsBlock', color: '#3ecfb2' },
    { name: 'Rich widgets', count: '13', items: 'StatCard · DataTable · Timeline · ProfileCard · Trombinoscope · JsonViewer · Hemicycle · Chart · Cards · GridData · Sankey · MapView · LogViewer', color: '#f0a050' },
    { name: 'WM layouts',   count: '4',  items: 'Pane · TilingLayout · FloatingLayout · StackLayout',                             color: '#fa6d7c' },
  ];

  const observers = [
    { name: 'BlockWrap',       subtitle: 'auto-registers 3 tools', badge: 'composer', color: '#7c6dfa' },
    { name: 'AnthropicProvider', subtitle: 'proxy to +server.ts',  badge: 'agent',    color: '#3ecfb2' },
    { name: 'GemmaProvider',   subtitle: 'WebGPU web worker',      badge: 'agent',    color: '#22c55e' },
    { name: 'McpClient',       subtitle: 'W3C WebMCP polyfill',    badge: 'core',     color: '#f0a050' },
    { name: 'runAgentLoop',    subtitle: 'data → UI tools',        badge: 'agent',    color: '#a855f7' },
    { name: 'encodeHyperSkill', subtitle: '?hs= + gzip',          badge: 'sdk',      color: '#fa6d7c' },
  ];
</script>

<svelte:head>
  <title>webmcp-auto-ui</title>
</svelte:head>

<div class="min-h-screen bg-bg font-sans">

  <!-- Header -->
  <header class="border-b border-border bg-surface px-8 py-5">
    <div class="max-w-6xl mx-auto flex items-center gap-4">
      <div class="font-mono text-lg font-bold">
        <span class="text-white">webmcp</span><span class="text-accent">-auto-ui</span>
      </div>
      <div class="text-xs font-mono text-zinc-600 border-l border-border pl-4">
        Svelte 5 · Tailwind · W3C WebMCP Draft 2026-03-27 · HyperSkill spec
      </div>
      <div class="flex-1"></div>
      <div class="flex items-center gap-1.5 text-xs font-mono text-teal">
        <div class="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></div>
        5 apps · {totalTools}+ tools · 32 components
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-8 py-10 flex flex-col gap-12">

    <!-- Stats row -->
    <section class="grid grid-cols-4 gap-4">
      <StatCard spec={{ label: 'npm packages',   value: '4',   variant: 'default', delta: 'core · ui · agent · sdk' }} />
      <StatCard spec={{ label: 'UI components',  value: '32',  variant: 'success', delta: '5 + 9 + 13 + 4 WM' }} />
      <StatCard spec={{ label: 'Apps',           value: '5',   variant: 'info',    delta: 'demos.hyperskills.net' }} />
      <StatCard spec={{ label: 'WebMCP tools',   value: `${totalTools}+`, variant: 'default', delta: 'auto-registered per block' }} />
    </section>

    <!-- Apps grid -->
    <section>
      <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Applications</h2>
      <div class="grid grid-cols-5 gap-3">
        {#each apps as app}
          <a href={app.url} target="_blank"
            class="block bg-surface border border-border rounded-xl overflow-hidden hover:border-white/20 transition-all group">
            <div class="h-0.5" style="background: {app.color}"></div>
            <div class="p-4">
              <div class="text-[10px] font-mono text-zinc-600 mb-1">{app.url.split('//')[1]}</div>
              <div class="font-bold text-xs text-zinc-200 mb-2 group-hover:text-white transition-colors leading-snug">{app.title}</div>
              <div class="text-[11px] text-zinc-500 leading-relaxed mb-3">{app.desc}</div>
              <div class="flex flex-wrap gap-1 mb-2">
                {#each app.tools as tool}
                  <span class="text-[9px] font-mono px-1 py-0.5 rounded bg-white/5 text-zinc-600">{tool}</span>
                {/each}
              </div>
              <div class="text-[10px] font-mono flex items-center gap-1 mt-2" style="color: {app.color}">
                <div class="w-1 h-1 rounded-full" style="background: {app.color}"></div>
                {app.badge}
              </div>
            </div>
          </a>
        {/each}
      </div>
    </section>

    <!-- Components overview + Getting started -->
    <section class="grid grid-cols-2 gap-8">

      <!-- Components -->
      <div>
        <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Component library — @webmcp-auto-ui/ui</h2>
        <DataTable spec={{
          compact: true,
          columns: [
            { key: 'name',  label: 'Category' },
            { key: 'count', label: '#', align: 'center' as const },
            { key: 'items', label: 'Components' },
          ],
          rows: components,
        }} />
      </div>

      <!-- Getting started -->
      <div>
        <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Getting started</h2>
        <Timeline spec={{ events: timelineEvents }} />
      </div>

    </section>

    <!-- Key modules -->
    <section>
      <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Key modules</h2>
      <Trombinoscope spec={{
        columns: 6,
        people: observers,
      }} />
    </section>

    <!-- Packages -->
    <section>
      <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Packages</h2>
      <Cards spec={{ cards: packages, minCardWidth: '280px' }} />
    </section>

    <!-- HyperSkill -->
    <section class="grid grid-cols-2 gap-6">
      <div>
        <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">HyperSkill format</h2>
        <AlertBlock data={{
          title: 'Portable skill URL',
          message: 'https://example.com?hs=base64(skill) — auto-compressed with gzip when >6KB. SHA-256 traceability, chainable across versions. Works in Chrome (~32K), Firefox (~65K), Safari (~80K).',
          level: 'info',
        }} />
      </div>
      <div>
        <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Quick start</h2>
        <TagsBlock data={{ label: 'npm run dev launches', tags: [
          { text: 'home :5173',     active: true },
          { text: 'composer :5174', active: true },
          { text: 'todo :5175',     active: true },
          { text: 'viewer :5176',   active: true },
          { text: 'showcase :5177', active: true },
          { text: 'mobile :5178',   active: true },
        ]}} />
      </div>
    </section>

    <!-- Chart — tools distribution -->
    <section>
      <h2 class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">WebMCP tools per app</h2>
      <Chart spec={{
        type: 'bar',
        labels: apps.map(a => a.title.split(' ')[0]),
        data: [{ values: apps.map(a => a.tools.filter(t => !t.startsWith('offline')).length), color: '#7c6dfa' }],
      }} />
    </section>

  </main>

  <footer class="border-t border-border px-8 py-5 mt-4">
    <div class="max-w-6xl mx-auto flex justify-between text-xs font-mono text-zinc-700">
      <span>webmcp-auto-ui · AGPL-3.0</span>
      <span>Svelte 5 · W3C WebMCP · HyperSkill spec · api.inaturalist.org (showcase mock)</span>
    </div>
  </footer>
</div>
