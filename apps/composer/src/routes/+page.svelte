<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { listSkills, loadDemoSkills, createSkill, deleteSkill, updateSkill, type Skill } from '@webmcp-auto-ui/sdk';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpClient, createToolGroup, textResult, jsonResult } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, GemmaProvider, runAgentLoop, fromMcpTools, trimConversationHistory, summarizeChat } from '@webmcp-auto-ui/agent';
  import type { GemmaStatus as GemmaStatusType } from '@webmcp-auto-ui/agent';
  import { Plus, Copy, Check, Save, Menu, ChevronLeft, ChevronRight, Settings } from 'lucide-svelte';
  import BlockWrap from '$lib/BlockWrap.svelte';
  import { ChatPanel, GemmaLoader, LLMSelector, McpConnector, AgentConsole, SettingsPanel, Button, Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@webmcp-auto-ui/ui';
  import type { ChatFeedItem } from '@webmcp-auto-ui/ui';
  import RecipesCRUD from '$lib/RecipesCRUD.svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let showExport = $state(false);
  let exportHsUrl = $state('');
  let editingId = $state<string | null>(null);
  let editJson = $state('');
  let copied = $state(false);
  let dragOver = $state(false);
  let mcpClient = $state<McpClient | null>(null);
  let skills = $state<Skill[]>([]);
  let mcpToken = $state('');
  let mcpRecipes = $state<{ name: string; description?: string; id?: string }[]>([]);

  // Console panel
  let consoleOpen = $state(false);

  // Auto-gen timer
  let autoGenTimer = $state(0);
  let autoGenTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

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

  function getOrCreateGemmaProvider(model: string): GemmaProvider {
    if (gemmaProvider && gemmaProvider.model === model) return gemmaProvider;
    if (gemmaProvider) destroyGemma();
    const p = new GemmaProvider({
      workerFactory: () => new Worker(new URL('@webmcp-auto-ui/agent/gemma-worker', import.meta.url), { type: 'module' }),
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
      return getOrCreateGemmaProvider(canvas.llm);
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
  let lastToolName = $state('');
  let includeSummary = $state(true);
  let allToolsUsed = $state<string[]>([]);

  // 4G: Skills CRUD
  let editingSkillId = $state<string | null>(null);
  let editingSkillJson = $state('');

  function createEmptySkill() {
    createSkill({ name: 'nouveau-skill', blocks: [] });
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
  let systemPrompt = $state(`Tu es un assistant UI connecté à un serveur MCP.

Tu as accès à deux familles d'outils :
1. **Outils DATA** (exposés par le serveur MCP connecté) — pour interroger les données
2. **Outils UI** (render_*) — pour composer l'interface graphique

WORKFLOW OBLIGATOIRE :
1. Utilise un outil DATA pour récupérer les données
2. Puis utilise un outil UI pour afficher les résultats visuellement
3. Ta réponse texte doit être TRÈS courte (1-2 phrases max) — l'essentiel est dans l'UI

CHOIX DES OUTILS UI :
- liste tous les outils MCP et WEBMCP

Propose TOUJOURS la visualisation la plus pertinente. Combine plusieurs render_* quand c'est utile. Sois très concis (1-2 phrases max).`);
  let cacheEnabled = $state(true);
  let maxTokens = $state(4096);
  let showSettings = $state(false);
  let showMcpTools = $state(false);

  const WEBMCP_UI_TOOLS = [
    'render_stat', 'render_kv', 'render_list', 'render_table',
    'render_chart', 'render_chart_rich', 'render_timeline', 'render_profile',
    'render_trombinoscope', 'render_hemicycle', 'render_sankey', 'render_cards',
    'render_json', 'render_d3', 'render_text', 'render_alert', 'render_code',
    'render_tags', 'render_gallery', 'render_carousel', 'render_log', 'clear_canvas',
    'update_block', 'move_block', 'resize_block', 'style_block',
  ];

  // Effective system prompt — auto-injects live MCP context (server, tools, recipes)
  // The base (systemPrompt) is user-editable; this section is always auto-appended.
  const effectiveSystemPrompt = $derived.by(() => {
    const base = systemPrompt.replace(
      '- liste tous les outils MCP et WEBMCP',
      WEBMCP_UI_TOOLS.map((t) => `- ${t}`).join('\n')
    );
    const sections: string[] = [base];
    if (canvas.mcpConnected) {
      const dataTools = (canvas.mcpTools as { name: string; description?: string }[])
        .filter((t) => !t.name.startsWith('render_') && t.name !== 'clear_canvas');
      if (dataTools.length > 0) {
        sections.push(
          `\n--- Contexte MCP : ${canvas.mcpName ?? 'serveur connecté'} ---\n` +
          `Outils DATA disponibles :\n` +
          dataTools.map((t) => `- ${t.name}${t.description ? ' : ' + t.description.split('\n')[0] : ''}`).join('\n')
        );
      }
      if (mcpRecipes.length > 0) {
        sections.push(
          `\nSkills disponibles (${mcpRecipes.length}) :\n` +
          mcpRecipes.map((r) => `- ${r.name}${r.description ? ' : ' + r.description : ''}`).join('\n')
        );
      }
    }
    return sections.join('');
  });

  // skills est initialisé dans onMount via listSkills() + onSkillsChange

  // LLM context sizes
  const LLM_CONTEXT: Record<string, string> = {
    haiku: '200K tokens', sonnet: '200K tokens',
    'gemma-e2b': '~8K tokens (WASM)', 'gemma-e4b': '~8K tokens (WASM)',
  };

  // React to LLM changes — untrack() pour éviter la boucle réactive :
  // gemmaStatus et gemmaProvider sont lus ET écrits dans cet effet,
  // ce qui provoque un effect_update_depth_exceeded sans untrack.
  $effect(() => {
    const llm = canvas.llm;  // seule dépendance trackée
    untrack(() => {
      if (llm === 'gemma-e2b' || llm === 'gemma-e4b') {
        const p = getOrCreateGemmaProvider(llm);
        if (gemmaStatus === 'idle') p.initialize();
      } else {
        // Switching away from Gemma — reset status display (but keep provider in memory)
        if (gemmaStatus === 'ready' || gemmaStatus === 'loading') {
          gemmaStatus = 'idle';
        }
      }
      canvas.addMsg('system', `LLM → ${llm} · contexte: ${LLM_CONTEXT[llm] ?? '?'}`);
    });
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

  // Derived console logs from canvas messages
  const consoleLogs = $derived(canvas.messages.map(m => `[${m.role}] ${m.content.slice(0, 300)}`));

  // ── MCP ───────────────────────────────────────────────────────────────────
  async function connectMcp() {
    if (!canvas.mcpUrl.trim() || canvas.mcpConnecting) return;
    canvas.setMcpConnecting(true);
    mcpConnectStart = Date.now();
    mcpConnectElapsed = 0;
    mcpToolCallCount = 0;
    mcpConnectTimer = setInterval(() => { mcpConnectElapsed = Math.round((Date.now() - mcpConnectStart) / 1000); }, 500);
    try {
      const clientOptions = mcpToken.trim()
        ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } }
        : undefined;
      const client = new McpClient(canvas.mcpUrl.trim(), clientOptions);
      const init = await client.connect();
      const tools = await client.listTools();
      mcpClient = client;
      canvas.setMcpConnected(true, init.serverInfo.name, tools as { name: string; description: string; inputSchema?: Record<string,unknown> }[]);
      canvas.addMsg('system', `MCP connecté : ${init.serverInfo.name} · ${tools.length} tools`);
      // Load recipes from MCP server if available
      if (tools.some((t: { name: string }) => t.name === 'list_recipes')) {
        try {
          const recipesResult = await client.callTool('list_recipes', {});
          const textContent = recipesResult.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined;
          if (textContent?.text) {
            const parsed: unknown = JSON.parse(textContent.text);
            mcpRecipes = Array.isArray(parsed) ? parsed : ((parsed as { recipes?: typeof mcpRecipes })?.recipes ?? []);
            canvas.addMsg('system', `📚 ${mcpRecipes.length} skills chargés depuis le serveur`);
          }
        } catch { /* list_recipes not available or parse error */ }
      }
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
    if ((canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') && gemmaStatus !== 'ready') {
      canvas.addMsg('system', `⏳ Gemma en cours de chargement — auto-generate différé, relancez manuellement une fois le modèle prêt`);
      return;
    }
    canvas.setGenerating(true);
    autoGenTimer = 0;
    autoGenTimerInterval = setInterval(() => { autoGenTimer++; }, 1000);
    canvas.clearBlocks();
    canvas.addMsg('system', 'mode auto — génération en cours…');
    try {
      await runAgentLoop('Génère une interface pour les données disponibles sur ce MCP.', {
        client: c,
        provider: activeProvider(),
        systemPrompt: effectiveSystemPrompt || undefined,
        maxTokens,
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data),
          onClear: () => canvas.clearBlocks(),
          onText: (text) => { if (text) canvas.addMsg('assistant', text); },
          onToolCall: (call) => { mcpToolCallCount++; lastToolName = call.name; allToolsUsed = [...allToolsUsed, call.name]; canvas.addMsg('system', `🔧 ${call.name}(${JSON.stringify(call.args).slice(0,100)}) → ${(call.result??'').slice(0,100)} [${call.elapsed??0}ms]`); },
        },
      });
    } catch (e) {
      canvas.addMsg('system', `❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (autoGenTimerInterval) { clearInterval(autoGenTimerInterval); autoGenTimerInterval = null; }
      canvas.setGenerating(false);
    }
  }

  async function sendChat(msg: string) {
    if (!msg.trim() || canvas.generating) return;
    // Guard: Gemma model must be ready before sending
    if ((canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') && gemmaStatus !== 'ready') {
      canvas.addMsg('system', `⏳ Gemma en cours de chargement (${gemmaStatus}) — patientez…`);
      return;
    }
    // Canvas messages (for consoleLogs)
    canvas.addMsg('user', msg);
    const thinking = canvas.addMsg('assistant', '', true);
    // Feed items for ChatPanel
    chatFeed = [...chatFeed, { kind: 'bubble', role: 'user', html: msg, id: uid() }];
    const thinkingFeedId = uid();
    chatFeed = [...chatFeed, { kind: 'bubble', role: 'assistant', html: '…', id: thinkingFeedId }];
    // Timer / counters
    chatTimer = 0; chatToolCount = 0; chatLastTool = '';
    chatTimerInterval = setInterval(() => { chatTimer++; }, 1000);
    canvas.setGenerating(true);
    try {
      const result = await runAgentLoop(msg, {
        client: mcpClient ?? undefined,
        provider: activeProvider(),
        systemPrompt: effectiveSystemPrompt || undefined,
        maxIterations: 15,
        maxTokens,
        initialMessages: trimConversationHistory(conversationHistory, maxContextTokens),
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => {
            canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data);
            chatFeed = [...chatFeed, { kind: 'block', id: uid(), type, data: data as Record<string, unknown> }];
          },
          onClear: () => canvas.clearBlocks(),
          onText: (text) => {
            canvas.updateMsg(thinking.id, text || '…', false);
            chatFeed = chatFeed.map(item => item.id === thinkingFeedId ? { ...item, html: text || '…' } as typeof item : item);
          },
          onToolCall: (call) => {
            mcpToolCallCount++; chatToolCount++; chatLastTool = call.name; allToolsUsed = [...allToolsUsed, call.name];
            canvas.updateMsg(thinking.id, `🔧 ${call.name}…`, true);
            canvas.addMsg('system', `🔧 ${call.name}(${JSON.stringify(call.args).slice(0,100)}) → ${(call.result??'').slice(0,100)} [${call.elapsed??0}ms]`);
            chatFeed = chatFeed.map(item => item.id === thinkingFeedId ? { ...item, html: `🔧 ${call.name}…` } as typeof item : item);
          },
        },
      });
      conversationHistory = result.messages; // save for next turn
    } catch (e) {
      const errMsg = `❌ ${e instanceof Error ? e.message : String(e)}`;
      canvas.updateMsg(thinking.id, errMsg, false);
      chatFeed = chatFeed.map(item => item.id === thinkingFeedId ? { ...item, html: errMsg } as typeof item : item);
    } finally {
      if (chatTimerInterval) { clearInterval(chatTimerInterval); chatTimerInterval = null; }
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
    const skill = canvas.buildSkillJSON() as Record<string, unknown>;

    if (includeSummary && conversationHistory.length > 0) {
      try {
        const result = await summarizeChat({
          messages: conversationHistory,
          provider: activeProvider(),
          toolsUsed: allToolsUsed,
          toolCallCount: mcpToolCallCount,
          mcpServers: mcpClient ? [canvas.mcpName ?? ''] : [],
          skillsReferenced: skills.map(s => s.name),
        });
        skill.chatSummary = result.chatSummary;
        skill.provenance = result.provenance;
      } catch { /* don't block export */ }
    }

    const json = JSON.stringify(skill);
    const bytes = new TextEncoder().encode(json);
    let param: string;
    // Auto-compress with gzip when payload exceeds 6 KB to keep URLs under nginx limits
    if (bytes.length > 6144) {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      param = 'gz.' + btoa(String.fromCharCode(...compressed))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } else {
      param = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
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
    // Load from ?hs= param (loadFromParam: format natif buildHyperskillParam)
    const param = new URLSearchParams(window.location.search).get('hs');
    if (param) {
      canvas.loadFromParam(param).then(() => {
        if (canvas.mcpUrl) connectMcp();
      });
    }
    refreshStats();
    skills = listSkills();
  });

  // Chat input handler
  let chatInput = $state('');
  let chatFeed = $state<ChatFeedItem[]>([]);
  let conversationHistory = $state<import('@webmcp-auto-ui/agent').ChatMessage[]>([]);
  let maxContextTokens = $state(150_000);
  let chatTimer = $state(0);
  let chatTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);
  let chatToolCount = $state(0);
  let chatLastTool = $state('');

  function uid() { return 'c_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36); }

  function onChatKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); chatInput = ''; }
  }
</script>

<svelte:head><title>Auto-UI Composer</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="min-h-12 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-1 border-b border-border bg-surface flex-shrink-0">
    <!-- Mobile hamburger -->
    <button class="md:hidden flex-shrink-0 text-text2 hover:text-white" onclick={() => { mobileMenuOpen = !mobileMenuOpen; }}>
      <Menu size={18} />
    </button>
    <div class="font-mono text-sm font-bold flex-shrink-0">
      <span class="text-text1">Auto</span><span class="text-accent">-UI</span>
      <span class="text-text2 text-xs ml-1">composer</span>
    </div>
    <a href="https://hyperskills.net" target="_blank" class="font-mono text-[10px] text-accent hover:underline flex-shrink-0 hidden md:inline">hyperskills.net</a>
    <div class="w-px h-5 bg-border2 hidden md:block"></div>
    <McpConnector
      class="hidden md:flex"
      url={canvas.mcpUrl}
      onurlchange={(v) => canvas.setMcpUrl(v)}
      connecting={canvas.mcpConnecting}
      connected={canvas.mcpConnected}
      serverName={canvas.mcpName ?? ''}
      onconnect={connectMcp}
      compact
    />
    <div class="w-px h-5 bg-border2 hidden md:block"></div>
    <LLMSelector value={canvas.llm} onchange={(v) => canvas.setLlm(v as 'haiku'|'sonnet'|'gemma-e2b'|'gemma-e4b')} />
    <!-- 4F: MCP stats -->
    {#if canvas.mcpConnected}
      <span class="font-mono text-[10px] text-text2 flex-shrink-0 hidden md:inline">
        HTTP streamable · {mcpToolCallCount} calls
      </span>
    {:else if canvas.mcpConnecting}
      <span class="font-mono text-[10px] text-text2 flex-shrink-0 hidden md:inline">{mcpConnectElapsed}s…</span>
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
    <!-- Theme toggle -->
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex items-center"
      onclick={() => {
        const root = document.documentElement;
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        try { localStorage.setItem('webmcp-theme', next); } catch {}
        import('@webmcp-auto-ui/ui').then(({ THEME_MAP }) => {
          const tokens = THEME_MAP[next as 'light'|'dark'];
          if (tokens) for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
        });
      }}
      aria-label="Toggle theme">
      ☀
    </button>
    <!-- Settings button -->
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:border-zinc-500 hover:text-text1 transition-all flex items-center"
      onclick={() => showSettings = true}>
      <Settings size={13} />
    </button>
    <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-text2 hover:border-zinc-500 hover:text-white transition-all hidden md:flex items-center gap-1.5"
      onclick={() => { showExport = true; canvas.buildHyperskillParam().then(p => { exportHsUrl = `${window.location.origin}/composer?hs=${p}`; }); }}>
      <Save size={11} /> export
    </button>
  </header>

  <!-- Gemma loading banner — full width, outside the header flex row -->
  <GemmaLoader status={gemmaStatus} progress={gemmaProgress} elapsed={gemmaLoadElapsed} loadedMB={gemmaLoadedMB} totalMB={gemmaTotalMB} modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm} onunload={destroyGemma} />

  <!-- MODE BAR -->
  <nav class="h-9 flex items-center gap-1 px-4 border-b border-border bg-surface flex-shrink-0">
    {#each [['auto','auto','LLM compose','accent'],['drag','drag & drop','semi-manuel','amber'],['chat','chat','dialogique','accent2']] as [id, label, sub, color]}
      <button class="font-mono text-xs px-3 py-1 rounded border transition-all
          {canvas.mode === id ? `border-${color}/40 bg-${color}/10 text-${color}` : 'border-transparent text-text2 hover:text-text1 hover:bg-white/5'}"
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
      <div class="flex items-center gap-2 ml-3">
        <div class="flex gap-0.5">
          {#each [0,1,2] as i}
            <div class="w-1 h-1 rounded-full bg-accent animate-pulse" style="animation-delay: {i*0.15}s"></div>
          {/each}
        </div>
        <span class="text-[10px] font-mono text-accent">{autoGenTimer}s</span>
        {#if mcpToolCallCount > 0}
          <span class="text-[10px] font-mono text-text2">{mcpToolCallCount} tool{mcpToolCallCount > 1 ? 's' : ''}</span>
        {/if}
        {#if lastToolName}
          <span class="text-[10px] font-mono text-text2 truncate max-w-24">🔧 {lastToolName}</span>
        {/if}
      </div>
    {/if}
  </nav>

  <!-- MAIN -->
  <div class="flex flex-1 overflow-hidden">

    <!-- LEFT PALETTE (4C: toggle + 4B: responsive) -->
    {#if !paletteOpen}
      <button class="hidden md:flex items-center justify-center w-5 border-r border-border bg-surface flex-shrink-0 text-text2 hover:text-text1 transition-colors"
        onclick={() => { paletteOpen = true; }}>
        <ChevronRight size={14} />
      </button>
    {/if}
    <aside class="hidden md:flex {paletteOpen ? 'w-52' : 'w-0'} border-r border-border bg-surface flex-col flex-shrink-0 overflow-hidden transition-all duration-200">
      {#if paletteOpen}
        <div class="flex items-center justify-between px-3 pt-3 pb-1">
          <div class="text-[10px] font-mono text-text2 uppercase tracking-widest">Blocs</div>
          <button class="text-text2 hover:text-text1" onclick={() => { paletteOpen = false; }}><ChevronLeft size={12} /></button>
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
                <span class="font-mono text-xs text-text2">{b.label}</span>
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
        {#if mcpRecipes.length > 0}
          <div class="h-px bg-border mx-3 my-2"></div>
          <div class="px-3 pb-2">
            <div class="text-[10px] font-mono text-text2 uppercase tracking-widest mb-1.5">Skills MCP ({mcpRecipes.length})</div>
            <div class="flex flex-col gap-0.5">
              {#each mcpRecipes as recipe}
                <div class="px-2 py-1.5 rounded text-xs font-mono text-accent2 border border-transparent hover:bg-white/5 hover:border-border2 transition-all">
                  <div class="font-medium">⚗ {recipe.name}</div>
                  {#if recipe.description}<div class="text-[10px] text-text2 mt-0.5 truncate">{recipe.description}</div>{/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
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
                <span class="font-mono text-xs text-text2">{b.label}</span>
              </button>
            {/each}
          </div>
        </div>
        <div class="h-px bg-border mx-3 my-2"></div>
        <!-- Mobile MCP inputs -->
        <div class="px-3 pb-2 flex flex-col gap-2">
          <div class="text-[10px] font-mono text-text2 uppercase tracking-widest">MCP</div>
          <McpConnector
            url={canvas.mcpUrl}
            onurlchange={(v) => canvas.setMcpUrl(v)}
            connecting={canvas.mcpConnecting}
            connected={canvas.mcpConnected}
            serverName={canvas.mcpName ?? ''}
            onconnect={connectMcp}
            compact
          />
        </div>
        <div class="h-px bg-border mx-3 my-2"></div>
        <div class="px-3 pb-3 flex-1 overflow-y-auto">
          <div class="flex items-center justify-between mb-2">
            <div class="text-[10px] font-mono text-text2 uppercase tracking-widest">Skills</div>
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

    <!-- CANVAS — caché sur mobile en mode chat (les blocs sont dans le feed) -->
    <main class="{canvas.mode === 'chat' ? 'hidden md:flex md:flex-1' : 'flex-1'} overflow-y-auto p-5 flex flex-col gap-3 {dragOver ? 'drag-over' : ''}"
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

    <!-- Mobile inline chat (mode chat, < md) — blocs dans le feed -->
    {#if canvas.mode === 'chat'}
      <div class="flex-1 flex flex-col min-h-0 md:hidden">
        <ChatPanel
          feed={chatFeed}
          bind:input={chatInput}
          generating={canvas.generating}
          timer={chatTimer}
          toolCount={chatToolCount}
          lastTool={chatLastTool}
          onsend={sendChat}
          placeholder="Décrivez l'interface voulue…"
          class="flex-1 min-h-0"
        />
      </div>
    {/if}

    <!-- Desktop sidebar chat (mode chat, ≥ md) — bulles seulement, blocs dans le canvas -->
    {#if canvas.mode === 'chat'}
      <aside class="hidden md:flex w-72 border-l border-border bg-surface flex-col flex-shrink-0">
        <div class="px-4 py-2 border-b border-border text-[10px] font-mono text-text2 uppercase tracking-widest">Chat UI ↗</div>
        <ChatPanel
          feed={chatFeed.filter(f => f.kind === 'bubble')}
          bind:input={chatInput}
          generating={canvas.generating}
          timer={chatTimer}
          toolCount={chatToolCount}
          lastTool={chatLastTool}
          onsend={sendChat}
          placeholder="Décrivez l'interface voulue…"
          class="flex-1 min-h-0"
        />
      </aside>
    {/if}

  </div>

  <!-- CONSOLE -->
  <AgentConsole logs={consoleLogs} bind:open={consoleOpen} />
</div>

<!-- EDIT MODAL -->
<Dialog open={!!editingId} onOpenChange={(v) => { if (!v) editingId = null; }}>
  <DialogContent class="w-[500px]">
    <DialogHeader>
      <DialogTitle class="text-sm font-mono">Éditer bloc</DialogTitle>
    </DialogHeader>
    <div class="p-5">
      <textarea class="w-full font-mono text-xs bg-black/30 border border-border text-teal rounded-lg p-3 h-48 outline-none resize-vertical leading-relaxed"
        bind:value={editJson}></textarea>
    </div>
    <DialogFooter>
      <Button variant="outline" size="sm" onclick={() => { editingId = null; }}>annuler</Button>
      <Button size="sm" onclick={saveEdit}>sauvegarder</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- EXPORT MODAL -->
<Dialog bind:open={showExport}>
  <DialogContent class="w-[640px] max-h-[85vh] flex flex-col">
    <DialogHeader>
      <DialogTitle class="text-sm font-mono">Export Skill</DialogTitle>
    </DialogHeader>
    <div class="flex-1 overflow-auto p-5 flex flex-col gap-4">
      <div>
        <div class="text-xs font-mono text-text2 mb-2">skill.json</div>
        <pre class="font-mono text-xs text-teal bg-black/30 border border-border rounded-lg p-4 overflow-x-auto leading-relaxed max-h-48">{JSON.stringify(canvas.buildSkillJSON(), null, 2)}</pre>
      </div>
      <div>
        <div class="text-xs font-mono text-text2 mb-2">HyperSkills URL</div>
        <div class="flex gap-2">
          <div class="flex-1 font-mono text-xs text-text2 bg-black/20 border border-border rounded-lg p-3 truncate">
            {exportHsUrl || 'compression…'}
          </div>
          <Button variant={copied ? 'default' : 'outline'} size="sm" class="flex items-center gap-2 {copied ? 'border-teal bg-teal/10 text-teal' : ''}"
            onclick={copyHsUrl}>
            {#if copied}<Check size={12} /> copié{:else}<Copy size={12} /> copier{/if}
          </Button>
        </div>
      </div>
      <label class="flex items-center gap-1.5 font-mono text-[10px] text-text2 cursor-pointer">
        <input type="checkbox" bind:checked={includeSummary} class="accent-accent w-3 h-3" />
        Inclure une synthèse anonymisée de la conversation
      </label>
    </div>
    <DialogFooter>
      <Button variant="outline" size="sm" onclick={() => showExport = false}>fermer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- SETTINGS MODAL (4H) -->
<Dialog bind:open={showSettings}>
  <DialogContent class="w-[500px]">
    <DialogHeader>
      <DialogTitle class="text-sm font-mono">Paramètres</DialogTitle>
    </DialogHeader>
    <div class="p-5">
      <SettingsPanel bind:systemPrompt bind:maxTokens bind:maxContextTokens bind:cacheEnabled />
    </div>
    <DialogFooter>
      <Button variant="outline" size="sm" onclick={() => showSettings = false}>fermer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- MCP TOOLS MODAL -->
<Dialog bind:open={showMcpTools}>
  <DialogContent class="w-[600px] max-h-[85vh] flex flex-col">
    <DialogHeader>
      <DialogTitle class="text-sm font-mono">MCP Tools — {canvas.mcpName}</DialogTitle>
    </DialogHeader>
    <div class="flex-1 overflow-auto p-5">
      <div class="flex flex-col gap-2">
        {#each canvas.mcpTools as tool}
          <div class="bg-surface2 border border-border rounded-lg px-4 py-3">
            <div class="font-mono text-xs text-accent font-semibold">{tool.name}</div>
            <div class="text-xs text-text2 mt-1">{tool.description}</div>
          </div>
        {/each}
      </div>
      {#if skills.length > 0}
        <div class="mt-4 pt-4 border-t border-border">
          <div class="text-xs font-mono text-text2 mb-2 uppercase tracking-wider">Skills ({skills.length})</div>
          <div class="flex flex-col gap-2">
            {#each skills as skill}
              <div class="bg-surface2 border border-border rounded-lg px-4 py-3">
                <div class="font-mono text-xs text-teal font-semibold">{skill.name}</div>
                {#if skill.description}<div class="text-xs text-text2 mt-1">{skill.description}</div>{/if}
                <div class="text-[10px] text-text2 mt-1">{skill.blocks.length} blocs{skill.mcp ? ` · MCP: ${skill.mcpName ?? skill.mcp}` : ''}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button variant="outline" size="sm" onclick={() => showMcpTools = false}>fermer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- SKILL EDIT MODAL (4G) -->
<Dialog open={!!editingSkillId} onOpenChange={(v) => { if (!v) editingSkillId = null; }}>
  <DialogContent class="w-[500px]">
    <DialogHeader>
      <DialogTitle class="text-sm font-mono">Editer skill</DialogTitle>
    </DialogHeader>
    <div class="p-5">
      <textarea class="w-full font-mono text-xs bg-black/30 border border-border text-teal rounded-lg p-3 h-48 outline-none resize-vertical leading-relaxed"
        bind:value={editingSkillJson}></textarea>
    </div>
    <DialogFooter>
      <Button variant="outline" size="sm" onclick={() => { editingSkillId = null; }}>annuler</Button>
      <Button size="sm" onclick={saveSkillEdit}>sauvegarder</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
