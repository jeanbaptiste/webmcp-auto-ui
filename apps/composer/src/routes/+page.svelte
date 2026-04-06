<script lang="ts">
  import { onMount } from 'svelte';
  import { listSkills, loadDemoSkills, type Skill } from '@webmcp-auto-ui/sdk';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpClient, createToolGroup, textResult, jsonResult } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, runAgentLoop, fromMcpTools } from '@webmcp-auto-ui/agent';
  import { X, Plus, Zap, Copy, Check, Save } from 'lucide-svelte';
  import BlockWrap from '$lib/BlockWrap.svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let showExport = $state(false);
  let editingId = $state<string | null>(null);
  let editJson = $state('');
  let copied = $state(false);
  let dragOver = $state(false);
  let mcpClient = $state<McpClient | null>(null);
  let skills = $state<Skill[]>([]);

  // Reactive skills list
  $effect(() => { skills = listSkills(); });

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
  async function connectMcp() {
    if (!canvas.mcpUrl || canvas.mcpConnecting) return;
    canvas.setMcpConnecting(true);
    try {
      const client = new McpClient(canvas.mcpUrl);
      const init = await client.connect();
      const tools = await client.listTools();
      mcpClient = client;
      canvas.setMcpConnected(true, init.serverInfo.name, tools as { name: string; description: string; inputSchema?: Record<string,unknown> }[]);
      canvas.addMsg('system', `MCP connecté : ${init.serverInfo.name} · ${tools.length} tools`);
      if (canvas.mode === 'auto') triggerAutoGenerate(client);
    } catch (e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
      canvas.addMsg('system', `❌ connexion échouée`);
    } finally {
      canvas.setMcpConnecting(false);
    }
  }

  // ── Agent ─────────────────────────────────────────────────────────────────
  const provider = new AnthropicProvider({ proxyUrl: '/api/chat' });

  async function triggerAutoGenerate(client?: McpClient) {
    const c = client ?? mcpClient;
    if (!c || canvas.generating) return;
    canvas.setGenerating(true);
    canvas.clearBlocks();
    canvas.addMsg('system', 'mode auto — génération en cours…');
    try {
      await runAgentLoop('Génère une interface pour les données disponibles sur ce MCP.', {
        client: c,
        provider,
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data),
          onClear: () => canvas.clearBlocks(),
          onText: (text) => { if (text) canvas.addMsg('assistant', text); },
          onToolCall: (call) => canvas.addMsg('system', `🔧 ${call.name}…`),
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
        provider,
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data),
          onClear: () => canvas.clearBlocks(),
          onText: (text) => canvas.updateMsg(thinking.id, text || '…', false),
          onToolCall: (call) => canvas.updateMsg(thinking.id, `🔧 ${call.name}…`, true),
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
    await navigator.clipboard.writeText(`${window.location.origin}?hs=${param}`);
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
  });

  // Chat input handler
  let chatInput = $state('');
  function onChatKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); chatInput = ''; }
  }
</script>

<svelte:head><title>HyperSkill Composer</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <div class="font-mono text-sm font-bold flex-shrink-0">
      <span class="text-white">Hyper</span><span class="text-accent">Skill</span>
      <span class="text-zinc-700 text-xs ml-1">composer</span>
    </div>
    <div class="w-px h-5 bg-border2"></div>
    <input class="font-mono text-xs bg-surface2 border border-border2 rounded px-3 h-7 w-72 text-zinc-300 outline-none focus:border-accent transition-colors placeholder-zinc-700"
      placeholder="https://mcp.example.com"
      bind:value={canvas.mcpUrl}
      onkeydown={(e) => e.key === 'Enter' && connectMcp()} />
    <button class="font-mono text-xs h-7 px-3 rounded border transition-all flex-shrink-0
        {canvas.mcpConnecting ? 'border-border text-zinc-600 cursor-wait' : 'border-border2 text-zinc-400 hover:border-teal hover:text-teal'}"
      onclick={connectMcp} disabled={canvas.mcpConnecting}>
      {canvas.mcpConnecting ? 'connexion…' : 'connect'}
    </button>
    <div class="w-px h-5 bg-border2"></div>
    <select class="font-mono text-xs bg-surface2 border border-border2 rounded px-2 h-7 text-zinc-400 outline-none cursor-pointer"
      value={canvas.llm} onchange={(e) => canvas.setLlm((e.target as HTMLSelectElement).value as 'haiku'|'sonnet'|'gemma-e2b')}>
      <option value="haiku">claude-haiku-4-5</option>
      <option value="sonnet">claude-sonnet-4-6</option>
      <option value="gemma-e2b">gemma-e2b (local)</option>
    </select>
    <div class="flex-1"></div>
    <span class="font-mono text-[10px] {canvas.statusColor} flex-shrink-0">{canvas.statusText}</span>
    <div class="w-px h-5 bg-border2"></div>
    <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-zinc-400 hover:border-zinc-500 hover:text-white transition-all flex items-center gap-1.5"
      onclick={() => showExport = true}>
      <Save size={11} /> export
    </button>
    <button class="font-mono text-xs h-7 px-3 rounded border transition-all flex items-center gap-1.5
        {copied ? 'border-teal bg-teal/10 text-teal' : 'border-accent bg-accent text-white hover:opacity-85'}"
      onclick={copyHsUrl}>
      {#if copied}<Check size={11} /> copié !{:else}<Copy size={11} /> hyperskill URL{/if}
    </button>
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
      <span class="font-mono text-[10px] text-zinc-600">{canvas.blockCount} bloc{canvas.blockCount > 1 ? 's' : ''}</span>
      <button class="font-mono text-[10px] text-zinc-600 hover:text-red-400 ml-2 transition-colors" onclick={() => canvas.clearBlocks()}>effacer</button>
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

    <!-- LEFT PALETTE -->
    <aside class="w-52 border-r border-border bg-surface flex flex-col flex-shrink-0 overflow-hidden">
      <div class="px-3 pt-3 pb-1">
        <div class="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Blocs</div>
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
      <div class="px-3 pb-3 flex-1 overflow-y-auto">
        <div class="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Recettes</div>
        <div class="flex flex-col gap-0.5">
          {#each skills as skill}
            <button class="text-left px-2 py-1.5 rounded text-xs font-mono text-teal hover:text-teal/80 hover:bg-teal/5 border border-transparent hover:border-teal/20 transition-all"
              onclick={() => applySkill(skill)}>
              ⚡ {skill.name}
            </button>
          {/each}
        </div>
      </div>
    </aside>

    <!-- CANVAS -->
    <main class="flex-1 overflow-y-auto p-5 flex flex-col gap-3 {dragOver ? 'drag-over' : ''}"
      ondragover={canvasDragover} ondragleave={canvasDragleave} ondrop={canvasDrop} role="list">
      {#if canvas.isEmpty}
        <div class="flex-1 flex flex-col items-center justify-center text-center pointer-events-none select-none">
          <div class="text-5xl opacity-10 mb-4">⬡</div>
          <p class="font-mono text-sm text-zinc-600">connectez un MCP · glissez des blocs · ou chatez</p>
          <p class="font-mono text-xs text-zinc-700 mt-2">double-cliquez sur un bloc pour l'ajouter directement</p>
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

    <!-- RIGHT CHAT (mode chat only) -->
    {#if canvas.mode === 'chat'}
      <aside class="w-72 border-l border-border bg-surface flex flex-col flex-shrink-0">
        <div class="px-4 py-2 border-b border-border text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Chat UI ↗</div>
        <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {#each canvas.messages as msg}
            <div class="text-xs leading-relaxed {msg.role === 'user' ? 'bg-surface2 border border-border2 rounded px-3 py-2 font-mono text-zinc-300' : msg.role === 'system' ? 'text-zinc-600 font-mono text-[10px] text-center' : 'text-zinc-400 px-1'}">
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
          <div class="text-xs font-mono text-zinc-500 mb-2">HyperSkill URL</div>
          <div class="flex gap-2">
            <div class="flex-1 font-mono text-xs text-zinc-400 bg-black/20 border border-border rounded-lg p-3 truncate">
              {window.location.origin}?hs={canvas.buildHyperskillParam()}
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
