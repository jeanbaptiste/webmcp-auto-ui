<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { listSkills, loadDemoSkills, createSkill, deleteSkill, updateSkill, type Skill } from '@webmcp-auto-ui/sdk';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpClient, createToolGroup, textResult, jsonResult } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, GemmaProvider, runAgentLoop, fromMcpTools } from '@webmcp-auto-ui/agent';
  import type { GemmaStatus as GemmaStatusType } from '@webmcp-auto-ui/agent';
  import { X, Plus, Zap, Copy, Check, Save, Menu, ChevronLeft, ChevronRight, Settings } from 'lucide-svelte';
  import BlockWrap from '$lib/BlockWrap.svelte';
  import SettingsModal from '$lib/SettingsModal.svelte';
  import GemmaStatus from '$lib/GemmaStatus.svelte';
  import RecipesCRUD from '$lib/RecipesCRUD.svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let showExport = $state(false);
  let editingId = $state<string | null>(null);
  let editJson = $state('');
  let copied = $state(false);
  let dragOver = $state(false);
  let mcpClient = $state<McpClient | null>(null);
  let skills = $state<Skill[]>([]);
  let mcpToken = $state('');
  let mcpUrlInput = $state(canvas.mcpUrl || '');

  // 4B: Mobile responsive
  let mobileMenuOpen = $state(false);
  let mobileChatOpen = $state(false);

  // 4C: Palette toggle
  let paletteOpen = $state(true);
  $effect(() => { paletteOpen = canvas.mode === 'drag'; });

  // 4D: Gemma provider
  let gemmaProvider = $state<GemmaProvider | null>(null);
  let gemmaStatus = $state<GemmaStatusType>('idle');
  let gemmaProgress = $state(0);
  let gemmaLoadStart = $state(0);
  let gemmaLoadElapsed = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);

  function getOrCreateGemmaProvider(model?: string): GemmaProvider {
    if (gemmaProvider) return gemmaProvider;
    const p = new GemmaProvider({
      workerFactory: () => new Worker(new URL('$lib/gemma.worker.ts', import.meta.url), { type: 'module' }),
      model,
      onProgress: (prog, _s, loaded, total) => {
        gemmaProgress = Math.round(prog);
        if (loaded) gemmaLoadedMB = Math.round(loaded / 1048576 * 100) / 100;
        if (total) gemmaTotalMB = Math.round(total / 1048576 * 100) / 100;
      },
      onStatusChange: (s) => {
        gemmaStatus = s;
        if (s === 'loading') {
          gemmaLoadStart = Date.now();
          gemmaTimerInterval = setInterval(() => { gemmaLoadElapsed = Math.round((Date.now() - gemmaLoadStart) / 1000); }, 500);
        }
        if (s === 'ready' || s === 'error') {
          if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
        }
      },
    });
    gemmaProvider = p;
    return p;
  }

  function destroyGemma() {
    gemmaProvider?.destroy();
    gemmaProvider = null;
    gemmaStatus = 'idle';
    gemmaProgress = 0;
    gemmaLoadElapsed = 0;
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  }

  function activeProvider() {
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      const model = canvas.llm === 'gemma-e4b' ? 'onnx-community/gemma-4-E4B-it-ONNX-GQA' : undefined;
      return getOrCreateGemmaProvider(model);
    }
    return provider;
  }

  // 4E: Stats
  let cpuCores = $state(0);
  let ramUsedMB = $state(0);
  let gpuAvailable = $state<string | null>(null);

  async function refreshStats() {
    cpuCores = navigator.hardwareConcurrency ?? 0;
    const perfMem = (performance as any).memory;
    if (perfMem) ramUsedMB = Math.round(perfMem.usedJSHeapSize / 1048576);
    try {
      const gpu = (navigator as any).gpu;
      if (gpu) {
        const adapter = await gpu.requestAdapter();
        gpuAvailable = adapter?.name ?? '✓';
      }
    } catch { /* no WebGPU */ }
  }

  // 4F: MCP stats
  let mcpConnectStart = $state(0);
  let mcpConnectElapsed = $state(0);
  let mcpConnectTimer = $state<ReturnType<typeof setInterval> | null>(null);
  let mcpToolCallCount = $state(0);

  // 4G: Recettes CRUD
  let editingSkillId = $state<string | null>(null);
  let editingSkillJson = $state('');

  function createEmptySkill() {
    createSkill({ name: 'nouvelle-recette', blocks: [] });
    skills = listSkills();
  }
  function removeSkill(id: string) {
    deleteSkill(id);
    skills = listSkills();
  }
  function openSkillEdit(id: string) {
    const s = skills.find(s => s.id === id);
    if (s) { editingSkillId = id; editingSkillJson = JSON.stringify({ name: s.name, description: s.description, blocks: s.blocks }, null, 2); }
  }
  function saveSkillEdit() {
    if (!editingSkillId) return;
    try {
      const parsed = JSON.parse(editingSkillJson);
      updateSkill(editingSkillId, parsed);
      skills = listSkills();
      editingSkillId = null;
    } catch { /* invalid JSON */ }
  }

  // 4H: Settings
  let systemPrompt = $state('You are a UI composer agent. When asked to create an interface, use the render_* tools to generate UI blocks. Use render_stat for KPIs, render_chart for data visualization, render_table for tabular data, render_kv for key-value pairs. Call only ONE tool at a time. Keep responses concise.');
  let cacheEnabled = $state(true);
  let maxTokens = $state(4096);
  let showSettings = $state(false);
  let showMcpTools = $state(false);

  // Reactive skills list
  $effect(() => { skills = listSkills(); });

  // Auto-initialize Gemma when selected in dropdown
  $effect(() => {
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      const model = canvas.llm === 'gemma-e4b' ? 'onnx-community/gemma-3-1b-it-ONNX' : undefined;
      const p = getOrCreateGemmaProvider(model);
      if (gemmaStatus === 'idle') p.initialize();
    }
  });

  // ── Block defaults ─────────────────────────────────────────────────────────
  const DEFAULTS: Record<string, Record<string, unknown>> = {
    stat:     { label: 'Métrique', value: '—', trendDir: 'up' },
    kv:       { title: 'Propriétés', rows: [['clé', 'valeur']] },
    list:     { title: 'Liste', items: ['élément 1', 'élément 2'] },
    chart:    { title: 'Graphique', bars: [['jan',60],['fév',80],['mar',45],['avr',90]] },
    alert:    { title: 'Alerte', message: 'Message système.', level: 'warn' },
    code:     { lang: 'json', content: '{\n  "status": "ok"\n}' },
    text:     { content: 'Texte libre.' },
    actions:  { buttons: [{ label: 'Action', primary: true }, { label: 'Annuler' }] },
    tags:     { label: 'Tags', tags: [{ text: 'actif', active: true }, { text: 'prod' }] },
    'stat-card':   { label: 'KPI', value: '—', variant: 'default' },
    'data-table':  { title: 'Tableau', rows: [], columns: [] },
    'timeline':    { title: 'Chronologie', events: [] },
    'profile':     { name: 'Nom Prénom', subtitle: 'Rôle' },
    'hemicycle':   { title: 'Hémicycle', groups: [] },
    'cards':       { title: 'Cartes', cards: [] },
    'json-viewer': { title: 'JSON', data: {} },
    'sankey':      { title: 'Flux', nodes: [], links: [] },
    'log':         { title: 'Logs', entries: [] },
  };

  const PALETTE = [
    { type: 'stat',     label: 'stat-card',   color: '#7c6dfa' },
    { type: 'kv',       label: 'kv-pair',     color: '#3ecfb2' },
    { type: 'list',     label: 'data-list',   color: '#f0a050' },
    { type: 'chart',    label: 'bar-chart',   color: '#a06dfa' },
    { type: 'alert',    label: 'alert',       color: '#f0a050' },
    { type: 'code',     label: 'code-block',  color: '#3ecfb2' },
    { type: 'text',     label: 'text',        color: '#888' },
    { type: 'actions',  label: 'action-row',  color: '#fa6d7c' },
    { type: 'tags',     label: 'tag-group',   color: '#fa6da0' },
    { type: 'stat-card',   label: 'stat-card+',  color: '#7c6dfa' },
    { type: 'data-table',  label: 'data-table',  color: '#3ecfb2' },
    { type: 'timeline',    label: 'timeline',    color: '#fa6d7c' },
    { type: 'profile',     label: 'profile',     color: '#7c6dfa' },
    { type: 'hemicycle',   label: 'hemicycle',   color: '#f0a050' },
    { type: 'cards',       label: 'cards',       color: '#3ecfb2' },
    { type: 'json-viewer', label: 'json-viewer', color: '#888' },
    { type: 'sankey',      label: 'sankey',      color: '#a06dfa' },
    { type: 'log',         label: 'log',         color: '#888' },
  ];

  // ── MCP ───────────────────────────────────────────────────────────────────
  let _mcpDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  function onMcpUrlChange() {
    canvas.setMcpUrl(mcpUrlInput);
    if (_mcpDebounceTimer) clearTimeout(_mcpDebounceTimer);
    _mcpDebounceTimer = setTimeout(() => {
      if (mcpUrlInput.startsWith('http')) connectMcp();
    }, 300);
  }

  async function connectMcp() {
    canvas.setMcpUrl(mcpUrlInput);
    if (!mcpUrlInput.trim() || canvas.mcpConnecting) return;
    canvas.setMcpConnecting(true);
    mcpConnectStart = Date.now();
    mcpConnectElapsed = 0;
    mcpToolCallCount = 0;
    mcpConnectTimer = setInterval(() => { mcpConnectElapsed = Math.round((Date.now() - mcpConnectStart) / 1000); }, 500);
    try {
      const clientOptions = mcpToken.trim()
        ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } }
        : undefined;
      const client = new McpClient(mcpUrlInput.trim(), clientOptions);
      const init = await client.connect();
      const tools = await client.listTools();
      mcpClient = client;
      canvas.setMcpConnected(true, init.serverInfo.name, tools as { name: string; description: string; inputSchema?: Record<string,unknown> }[]);
      canvas.addMsg('system', `MCP connecté : ${init.serverInfo.name} · ${tools.length} tools`);
      if (canvas.mode === 'auto') triggerAutoGenerate(client);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      canvas.setMcpError(errMsg);
      canvas.addMsg('system', `❌ ${errMsg}`);
    } finally {
      canvas.setMcpConnecting(false);
      if (mcpConnectTimer) { clearInterval(mcpConnectTimer); mcpConnectTimer = null; }
    }
  }

  // ── Agent ─────────────────────────────────────────────────────────────────
  const provider = new AnthropicProvider({ proxyUrl: `${base}/api/chat` });

  async function triggerAutoGenerate(client?: McpClient) {
    const c = client ?? mcpClient;
    if (!c || canvas.generating) return;
    canvas.setGenerating(true);
    canvas.clearBlocks();
    canvas.addMsg('system', 'mode auto — génération en cours…');
    try {
      await runAgentLoop('Génère une interface pour les données disponibles sur ce MCP.', {
        client: c,
        provider: activeProvider(),
        systemPrompt: systemPrompt || undefined,
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data),
          onClear: () => canvas.clearBlocks(),
          onText: (text) => { if (text) canvas.addMsg('assistant', text); },
          onToolCall: (call) => { mcpToolCallCount++; canvas.addMsg('system', `🔧 ${call.name}…`); },
        },
      });
    } catch (e) {
      canvas.addMsg('system', `❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      canvas.setGenerating(false);
    }
  }

  async function sendChat(msg: string) {
    if (!msg.trim() || canvas.generating) return;
    canvas.addMsg('user', msg);
    const thinking = canvas.addMsg('assistant', '', true);
    canvas.setGenerating(true);
    try {
      await runAgentLoop(msg, {
        client: mcpClient ?? undefined,
        provider: activeProvider(),
        systemPrompt: systemPrompt || undefined,
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data),
          onClear: () => canvas.clearBlocks(),
          onText: (text) => canvas.updateMsg(thinking.id, text || '…', false),
          onToolCall: (call) => { mcpToolCallCount++; canvas.updateMsg(thinking.id, `🔧 ${call.name}…`, true); },
        },
      });
    } catch (e) {
      canvas.updateMsg(thinking.id, `❌ ${e instanceof Error ? e.message : String(e)}`, false);
    } finally {
      canvas.setGenerating(false);
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function paletteDragStart(e: DragEvent, type: string) {
    e.dataTransfer!.setData('palette-type', type);
    e.dataTransfer!.effectAllowed = 'copy';
  }

  function canvasDragover(e: DragEvent) { e.preventDefault(); dragOver = true; }
  function canvasDragleave(e: DragEvent) {
    const t = e.currentTarget as HTMLElement;
    if (!t.contains(e.relatedTarget as Node)) dragOver = false;
  }
  function canvasDrop(e: DragEvent) {
    e.preventDefault(); dragOver = false;
    const type = e.dataTransfer?.getData('palette-type');
    const blockId = e.dataTransfer?.getData('block-id');
    if (type && !blockId) canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], DEFAULTS[type] ?? {});
  }

  function blockDragStart(e: DragEvent, id: string) {
    e.dataTransfer!.setData('block-id', id);
    e.dataTransfer!.effectAllowed = 'move';
  }

  function blockDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const srcId = e.dataTransfer?.getData('block-id');
    const srcType = e.dataTransfer?.getData('palette-type');
    if (srcId && srcId !== targetId) canvas.moveBlock(srcId, targetId);
    else if (srcType) {
      const idx = canvas.blocks.findIndex(b => b.id === targetId);
      const newBlock = canvas.addBlock(srcType as Parameters<typeof canvas.addBlock>[0], DEFAULTS[srcType] ?? {});
      // move to correct position
      const blocks = [...canvas.blocks];
      const from = blocks.findIndex(b => b.id === newBlock.id);
      const [moved] = blocks.splice(from, 1);
      blocks.splice(idx, 0, moved);
      canvas.setBlocks(blocks);
    }
  }

  // ── Edit modal ────────────────────────────────────────────────────────────
  function openEdit(id: string) {
    const b = canvas.blocks.find(b => b.id === id);
    if (b) { editingId = id; editJson = JSON.stringify(b.data, null, 2); }
  }

  function saveEdit() {
    if (!editingId) return;
    try {
      canvas.updateBlock(editingId, JSON.parse(editJson));
      editingId = null;
    } catch { /* invalid JSON */ }
  }

  // ── HyperSkill ────────────────────────────────────────────────────────────
  async function copyHsUrl() {
    const param = canvas.buildHyperskillParam();
    await navigator.clipboard.writeText(`${window.location.origin}/composer?hs=${param}`);
    copied = true; setTimeout(() => { copied = false; }, 2000);
  }

  function applySkill(skill: Skill) {
    canvas.setBlocks(skill.blocks.map(b => ({
      id: 'b_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
      type: b.type as Parameters<typeof canvas.addBlock>[0],
      data: b.data,
    })));
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  onMount(() => {
    // Load from ?hs= param
    const param = new URLSearchParams(window.location.search).get('hs');
    if (param) canvas.loadFromParam(param);
    refreshStats();
  });

  // Chat input handler
  let chatInput = $state('');
  function onChatKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); chatInput = ''; }
  }
</script>

<svelte:head><title>Auto-UI Composer</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0 overflow-x-auto">
    <!-- Mobile hamburger -->
    <button class="md:hidden flex-shrink-0 text-zinc-400 hover:text-white" onclick={() => { mobileMenuOpen = !mobileMenuOpen; }}>
      <Menu size={18} />
    </button>
    <div class="font-mono text-sm font-bold flex-shrink-0">
      <span class="text-text1">Auto</span><span class="text-accent">-UI</span>
      <span class="text-text2 text-xs ml-1">composer</span>
    </div>
    <a href="https://hyperskills.net" target="_blank" class="font-mono text-[10px] text-accent hover:underline flex-shrink-0 hidden md:inline">hyperskills.net</a>
    <div class="w-px h-5 bg-border2 hidden md:block"></div>
    <input class="font-mono text-xs bg-surface2 border border-border2 rounded px-3 h-7 w-72 text-zinc-300 outline-none focus:border-accent transition-colors placeholder:text-text2 hidden md:block"
      placeholder="https://mcp.example.com"
      bind:value={mcpUrlInput}
      oninput={() => canvas.setMcpUrl(mcpUrlInput)}
      onkeydown={(e) => e.key === 'Enter' && connectMcp()}
      onchange={onMcpUrlChange} />
    <button class="font-mono text-xs h-7 px-3 rounded border transition-all flex-shrink-0 hidden md:flex items-center
        {canvas.mcpConnecting ? 'border-border text-text2 cursor-wait' : 'border-border2 text-zinc-400 hover:border-teal hover:text-teal'}"
      onclick={connectMcp} disabled={canvas.mcpConnecting}>
      {canvas.mcpConnecting ? 'connexion…' : 'connect'}
    </button>
    <div class="w-px h-5 bg-border2 hidden md:block"></div>
    <select class="font-mono text-xs bg-surface2 border border-border2 rounded px-2 h-7 text-zinc-400 outline-none cursor-pointer"
      value={canvas.llm} onchange={(e) => canvas.setLlm((e.target as HTMLSelectElement).value as 'haiku'|'sonnet'|'gemma-e2b'|'gemma-e4b')}>
      <option value="haiku">claude-haiku-4-5</option>
      <option value="sonnet">claude-sonnet-4-6</option>
      <option value="gemma-e2b">Gemma E2B (WASM)</option>
      <option value="gemma-e4b">Gemma E4B (WASM)</option>
    </select>
    <!-- 4D: Gemma loader indicator -->
    <GemmaStatus status={gemmaStatus} progress={gemmaProgress} elapsed={gemmaLoadElapsed} loadedMB={gemmaLoadedMB} totalMB={gemmaTotalMB} onunload={destroyGemma} />
    <!-- 4F: MCP stats -->
    {#if canvas.mcpConnected}
      <span class="font-mono text-[10px] text-zinc-500 flex-shrink-0 hidden md:inline">
        HTTP streamable · {mcpToolCallCount} calls
      </span>
    {:else if canvas.mcpConnecting}
      <span class="font-mono text-[10px] text-zinc-500 flex-shrink-0 hidden md:inline">{mcpConnectElapsed}s…</span>
    {/if}
    <!-- 4E: Stats (WASM provider active) -->
    {#if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') && cpuCores > 0}
      <span class="font-mono text-[10px] text-text2 flex-shrink-0 hidden md:inline">
        {cpuCores} cores{ramUsedMB ? ` · ${ramUsedMB}MB` : ''}{gpuAvailable ? ` · GPU: ${gpuAvailable}` : ''}
      </span>
    {/if}
    <div class="flex-1"></div>
    <button class="font-mono text-[10px] {canvas.statusColor} flex-shrink-0 hidden md:inline hover:underline cursor-pointer"
      onclick={() => { if (canvas.mcpConnected) showMcpTools = true; }}
      disabled={!canvas.mcpConnected}>
      {canvas.statusText}
    </button>
    <div class="w-px h-5 bg-border2 hidden md:block"></div>
    <!-- 4H: Settings button -->
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-zinc-400 hover:border-zinc-500 hover:text-white transition-all flex items-center"
      onclick={() => showSettings = true}>
      <Settings size={13} />
    </button>
    <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-zinc-400 hover:border-zinc-500 hover:text-white transition-all hidden md:flex items-center gap-1.5"
      onclick={() => showExport = true}>
      <Save size={11} /> export
    </button>
    <!-- Mobile chat toggle -->
    {#if canvas.mode === 'chat'}
      <button class="md:hidden font-mono text-xs h-7 px-2 rounded border border-accent text-accent flex-shrink-0"
        onclick={() => { mobileChatOpen = !mobileChatOpen; }}>
        chat
      </button>
    {/if}
  </header>

  <!-- MODE BAR -->
  <nav class="h-9 flex items-center gap-1 px-4 border-b border-border bg-surface flex-shrink-0">
    {#each [['auto','auto','LLM compose','accent'],['drag','drag & drop','semi-manuel','amber'],['chat','chat','dialogique','accent2']] as [id, label, sub, color]}
      <button class="font-mono text-xs px-3 py-1 rounded border transition-all
          {canvas.mode === id ? `border-${color}/40 bg-${color}/10 text-${color}` : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}"
        onclick={() => { canvas.setMode(id as 'auto'|'drag'|'chat'); if (id === 'auto' && canvas.mcpConnected) triggerAutoGenerate(); }}>
        {label} <span class="text-[9px] opacity-50 ml-1">◆ {sub}</span>
      </button>
    {/each}
    <div class="flex-1"></div>
    {#if canvas.blockCount > 0}
      <span class="font-mono text-[10px] text-text2">{canvas.blockCount} bloc{canvas.blockCount > 1 ? 's' : ''}</span>
      <button class="font-mono text-[10px] text-text2 hover:text-red-400 ml-2 transition-colors" onclick={() => canvas.clearBlocks()}>effacer</button>
    {/if}
    {#if canvas.generating}
      <div class="flex gap-1 ml-3">
        {#each [0,1,2] as i}
          <div class="w-1 h-1 rounded-full bg-accent animate-pulse" style="animation-delay: {i*0.2}s"></div>
        {/each}
      </div>
    {/if}
  </nav>

  <!-- MAIN -->
  <div class="flex flex-1 overflow-hidden">

    <!-- LEFT PALETTE (4C: toggle + 4B: responsive) -->
    {#if !paletteOpen}
      <button class="hidden md:flex items-center justify-center w-5 border-r border-border bg-surface flex-shrink-0 text-text2 hover:text-zinc-300 transition-colors"
        onclick={() => { paletteOpen = true; }}>
        <ChevronRight size={14} />
      </button>
    {/if}
    <aside class="hidden md:flex {paletteOpen ? 'w-52' : 'w-0'} border-r border-border bg-surface flex-col flex-shrink-0 overflow-hidden transition-all duration-200">
      {#if paletteOpen}
        <div class="flex items-center justify-between px-3 pt-3 pb-1">
          <div class="text-[10px] font-mono text-text2 uppercase tracking-widest">Blocs</div>
          <button class="text-text2 hover:text-zinc-300" onclick={() => { paletteOpen = false; }}><ChevronLeft size={12} /></button>
        </div>
        <div class="px-3 pb-1">
          <div class="flex flex-col gap-0.5 overflow-y-auto max-h-64">
            {#each PALETTE as b}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab hover:bg-white/5 border border-transparent hover:border-border2 transition-all select-none"
                draggable="true"
                ondragstart={(e) => paletteDragStart(e, b.type)}
                ondblclick={() => canvas.addBlock(b.type as Parameters<typeof canvas.addBlock>[0], DEFAULTS[b.type] ?? {})}>
                <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:{b.color}"></div>
                <span class="font-mono text-xs text-zinc-400">{b.label}</span>
              </div>
            {/each}
          </div>
        </div>
        <div class="h-px bg-border mx-3 my-2"></div>
        <RecipesCRUD
          {skills}
          onapply={applySkill}
          oncreate={createEmptySkill}
          ondelete={removeSkill}
          onedit={(skill) => openSkillEdit(skill.id)}
        />
      {/if}
    </aside>

    <!-- Mobile palette overlay (4B) -->
    {#if mobileMenuOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="fixed inset-0 bg-black/60 z-40 md:hidden" onclick={() => { mobileMenuOpen = false; }}></div>
      <aside class="fixed left-0 top-12 bottom-0 w-64 bg-surface border-r border-border z-50 md:hidden flex flex-col overflow-y-auto">
        <div class="px-3 pt-3 pb-1">
          <div class="text-[10px] font-mono text-text2 uppercase tracking-widest mb-2">Blocs</div>
          <div class="flex flex-col gap-0.5">
            {#each PALETTE as b}
              <button class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-left"
                onclick={() => { canvas.addBlock(b.type as Parameters<typeof canvas.addBlock>[0], DEFAULTS[b.type] ?? {}); mobileMenuOpen = false; }}>
                <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:{b.color}"></div>
                <span class="font-mono text-xs text-zinc-400">{b.label}</span>
              </button>
            {/each}
          </div>
        </div>
        <div class="h-px bg-border mx-3 my-2"></div>
        <!-- Mobile MCP inputs -->
        <div class="px-3 pb-2 flex flex-col gap-2">
          <div class="text-[10px] font-mono text-text2 uppercase tracking-widest">MCP</div>
          <input class="font-mono text-xs bg-surface2 border border-border2 rounded px-3 h-7 w-full text-zinc-300 outline-none focus:border-accent placeholder:text-text2"
            placeholder="https://mcp.example.com"
            bind:value={mcpUrlInput}
      oninput={() => canvas.setMcpUrl(mcpUrlInput)}
            onkeydown={(e) => e.key === 'Enter' && connectMcp()}
            onchange={onMcpUrlChange} />
          <button class="font-mono text-xs h-7 px-3 rounded border flex-shrink-0
              {canvas.mcpConnecting ? 'border-border text-text2' : 'border-border2 text-zinc-400 hover:border-teal hover:text-teal'}"
            onclick={connectMcp} disabled={canvas.mcpConnecting}>
            {canvas.mcpConnecting ? 'connexion…' : 'connect'}
          </button>
        </div>
        <div class="h-px bg-border mx-3 my-2"></div>
        <div class="px-3 pb-3 flex-1 overflow-y-auto">
          <div class="flex items-center justify-between mb-2">
            <div class="text-[10px] font-mono text-text2 uppercase tracking-widest">Recettes</div>
            <button class="text-text2 hover:text-teal" onclick={createEmptySkill}><Plus size={12} /></button>
          </div>
          <div class="flex flex-col gap-0.5">
            {#each skills as skill}
              <button class="text-left px-2 py-1.5 rounded text-xs font-mono text-teal hover:text-teal/80 hover:bg-teal/5 border border-transparent hover:border-teal/20 transition-all"
                onclick={() => { applySkill(skill); mobileMenuOpen = false; }}>
                ⚡ {skill.name}
              </button>
            {/each}
          </div>
        </div>
      </aside>
    {/if}

    <!-- CANVAS -->
    <main class="flex-1 overflow-y-auto p-5 flex flex-col gap-3 {dragOver ? 'drag-over' : ''}"
      ondragover={canvasDragover} ondragleave={canvasDragleave} ondrop={canvasDrop} role="list">
      {#if canvas.isEmpty}
        <div class="flex-1 flex flex-col items-center justify-center text-center pointer-events-none select-none">
          <div class="text-5xl opacity-10 mb-4">⬡</div>
          <p class="font-mono text-sm text-text2">connectez un MCP · glissez des blocs · ou chatez</p>
          <p class="font-mono text-xs text-text2 mt-2">double-cliquez sur un bloc pour l'ajouter directement</p>
        </div>
      {:else}
        {#each canvas.blocks as block (block.id)}
          <BlockWrap
            {block}
            onEdit={openEdit}
            onDragStart={(e, id) => blockDragStart(e, id)}
            onDrop={(e, id) => blockDrop(e, id)}
          />
        {/each}
      {/if}
    </main>

    <!-- RIGHT CHAT (mode chat — desktop sidebar) -->
    {#if canvas.mode === 'chat'}
      <aside class="hidden md:flex w-72 border-l border-border bg-surface flex-col flex-shrink-0">
        <div class="px-4 py-2 border-b border-border text-[10px] font-mono text-text2 uppercase tracking-widest">Chat UI ↗</div>
        <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {#each canvas.messages as msg}
            <div class="text-xs leading-relaxed {msg.role === 'user' ? 'bg-surface2 border border-border2 rounded px-3 py-2 font-mono text-zinc-300' : msg.role === 'system' ? 'text-text2 font-mono text-[10px] text-center' : 'text-zinc-400 px-1'}">
              {#if msg.thinking}
                <span class="inline-flex gap-1">
                  {#each [0,1,2] as i}<span class="w-1 h-1 rounded-full bg-accent animate-pulse inline-block" style="animation-delay:{i*0.2}s"></span>{/each}
                </span>
              {:else}
                {msg.content}
              {/if}
            </div>
          {/each}
        </div>
        <div class="flex gap-2 p-2 border-t border-border">
          <textarea class="flex-1 font-mono text-xs bg-surface2 border border-border2 text-zinc-300 rounded px-2 py-1.5 outline-none resize-none h-14 focus:border-accent"
            placeholder="Décrivez l'interface voulue…"
            bind:value={chatInput}
            onkeydown={onChatKeydown}></textarea>
          <button class="font-mono text-xs px-3 rounded border border-accent bg-accent text-white hover:opacity-85 self-end h-8"
            onclick={() => { sendChat(chatInput); chatInput = ''; }}>↑</button>
        </div>
      </aside>
    {/if}

    <!-- Mobile chat overlay (4B) -->
    {#if canvas.mode === 'chat' && mobileChatOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="fixed inset-0 bg-black/60 z-40 md:hidden" onclick={() => { mobileChatOpen = false; }}></div>
      <aside class="fixed right-0 top-12 bottom-0 w-80 max-w-[90vw] bg-surface border-l border-border z-50 md:hidden flex flex-col">
        <div class="flex items-center justify-between px-4 py-2 border-b border-border">
          <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">Chat UI</span>
          <button class="text-zinc-500 hover:text-white" onclick={() => { mobileChatOpen = false; }}><X size={14} /></button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {#each canvas.messages as msg}
            <div class="text-xs leading-relaxed {msg.role === 'user' ? 'bg-surface2 border border-border2 rounded px-3 py-2 font-mono text-zinc-300' : msg.role === 'system' ? 'text-text2 font-mono text-[10px] text-center' : 'text-zinc-400 px-1'}">
              {#if msg.thinking}
                <span class="inline-flex gap-1">
                  {#each [0,1,2] as i}<span class="w-1 h-1 rounded-full bg-accent animate-pulse inline-block" style="animation-delay:{i*0.2}s"></span>{/each}
                </span>
              {:else}
                {msg.content}
              {/if}
            </div>
          {/each}
        </div>
        <div class="flex gap-2 p-2 border-t border-border">
          <textarea class="flex-1 font-mono text-xs bg-surface2 border border-border2 text-zinc-300 rounded px-2 py-1.5 outline-none resize-none h-14 focus:border-accent"
            placeholder="Décrivez l'interface voulue…"
            bind:value={chatInput}
            onkeydown={onChatKeydown}></textarea>
          <button class="font-mono text-xs px-3 rounded border border-accent bg-accent text-white hover:opacity-85 self-end h-8"
            onclick={() => { sendChat(chatInput); chatInput = ''; }}>↑</button>
        </div>
      </aside>
    {/if}

  </div>
</div>

<!-- EDIT MODAL -->
{#if editingId}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-border2 rounded-xl w-[500px] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <span class="text-sm font-mono text-zinc-300">Éditer bloc</span>
        <button onclick={() => { editingId = null; }} class="text-zinc-500 hover:text-white"><X size={16} /></button>
      </div>
      <div class="p-5">
        <textarea class="w-full font-mono text-xs bg-black/30 border border-border text-teal rounded-lg p-3 h-48 outline-none resize-vertical leading-relaxed"
          bind:value={editJson}></textarea>
      </div>
      <div class="flex justify-end gap-3 px-5 py-4 border-t border-border">
        <button class="font-mono text-xs px-4 py-2 rounded border border-border2 text-zinc-400 hover:text-white" onclick={() => { editingId = null; }}>annuler</button>
        <button class="font-mono text-xs px-4 py-2 rounded bg-accent text-white hover:opacity-85" onclick={saveEdit}>sauvegarder</button>
      </div>
    </div>
  </div>
{/if}

<!-- EXPORT MODAL -->
{#if showExport}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-border2 rounded-xl w-[640px] max-h-[85vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <span class="text-sm font-mono text-zinc-300">Export Skill</span>
        <button onclick={() => showExport = false} class="text-zinc-500 hover:text-white"><X size={16} /></button>
      </div>
      <div class="flex-1 overflow-auto p-5 flex flex-col gap-4">
        <div>
          <div class="text-xs font-mono text-zinc-500 mb-2">skill.json</div>
          <pre class="font-mono text-xs text-teal bg-black/30 border border-border rounded-lg p-4 overflow-x-auto leading-relaxed max-h-48">{JSON.stringify(canvas.buildSkillJSON(), null, 2)}</pre>
        </div>
        <div>
          <div class="text-xs font-mono text-zinc-500 mb-2">HyperSkills URL</div>
          <div class="flex gap-2">
            <div class="flex-1 font-mono text-xs text-zinc-400 bg-black/20 border border-border rounded-lg p-3 truncate">
              {window.location.origin}/composer?hs={canvas.buildHyperskillParam()}
            </div>
            <button class="px-3 rounded border transition-all text-xs font-mono flex items-center gap-2
                {copied ? 'border-teal bg-teal/10 text-teal' : 'border-border2 text-zinc-400 hover:border-accent hover:text-accent'}"
              onclick={copyHsUrl}>
              {#if copied}<Check size={12} /> copié{:else}<Copy size={12} /> copier{/if}
            </button>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-3 px-5 py-4 border-t border-border">
        <button class="font-mono text-xs px-4 py-2 rounded border border-border2 text-zinc-400 hover:text-white" onclick={() => showExport = false}>fermer</button>
      </div>
    </div>
  </div>
{/if}

<!-- SETTINGS MODAL (4H) -->
<SettingsModal
  show={showSettings}
  {systemPrompt} {maxTokens} {cacheEnabled}
  onclose={() => showSettings = false}
  onsystemprompt={(v) => systemPrompt = v}
  onmaxtokens={(v) => maxTokens = v}
  oncache={(v) => cacheEnabled = v}
/>

<!-- MCP TOOLS MODAL -->
{#if showMcpTools}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-border2 rounded-xl w-[600px] max-h-[85vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <span class="text-sm font-mono text-text1">MCP Tools — {canvas.mcpName}</span>
        <button onclick={() => showMcpTools = false} class="text-text2 hover:text-text1"><X size={16} /></button>
      </div>
      <div class="flex-1 overflow-auto p-5">
        <div class="flex flex-col gap-2">
          {#each canvas.mcpTools as tool}
            <div class="bg-surface2 border border-border rounded-lg px-4 py-3">
              <div class="font-mono text-xs text-accent font-semibold">{tool.name}</div>
              <div class="text-xs text-text2 mt-1">{tool.description}</div>
            </div>
          {/each}
        </div>
      </div>
      <div class="flex justify-end gap-3 px-5 py-4 border-t border-border">
        <button class="font-mono text-xs px-4 py-2 rounded border border-border2 text-text2 hover:text-text1" onclick={() => showMcpTools = false}>fermer</button>
      </div>
    </div>
  </div>
{/if}

<!-- SKILL EDIT MODAL (4G) -->
{#if editingSkillId}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-border2 rounded-xl w-[500px] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <span class="text-sm font-mono text-zinc-300">Editer recette</span>
        <button onclick={() => { editingSkillId = null; }} class="text-zinc-500 hover:text-white"><X size={16} /></button>
      </div>
      <div class="p-5">
        <textarea class="w-full font-mono text-xs bg-black/30 border border-border text-teal rounded-lg p-3 h-48 outline-none resize-vertical leading-relaxed"
          bind:value={editingSkillJson}></textarea>
      </div>
      <div class="flex justify-end gap-3 px-5 py-4 border-t border-border">
        <button class="font-mono text-xs px-4 py-2 rounded border border-border2 text-zinc-400 hover:text-white" onclick={() => { editingSkillId = null; }}>annuler</button>
        <button class="font-mono text-xs px-4 py-2 rounded bg-accent text-white hover:opacity-85" onclick={saveSkillEdit}>sauvegarder</button>
      </div>
    </div>
  </div>
{/if}
