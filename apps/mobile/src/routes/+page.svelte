<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { ChatPanel, GemmaLoader, LLMSelector, McpStatus, McpConnector, AgentConsole, SettingsPanel } from '@webmcp-auto-ui/ui';
  import type { ChatFeedItem } from '@webmcp-auto-ui/ui';
  import {
    loadDemoSkills, listSkills, createSkill, updateSkill, deleteSkill,
    encode, decode, type Skill, type HyperSkill,
  } from '@webmcp-auto-ui/sdk';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpClient, jsonResult, textResult } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, GemmaProvider, runAgentLoop, fromMcpTools, trimConversationHistory, summarizeChat } from '@webmcp-auto-ui/agent';

  // ── State ─────────────────────────────────────────────────────────────────
  let feed = $state<ChatFeedItem[]>([]);
  let conversationHistory = $state<import('@webmcp-auto-ui/agent').ChatMessage[]>([]);
  let maxContextTokens = $state(150_000);
  let mcpRecipes = $state<{ name: string; description?: string }[]>([]);

  const WEBMCP_UI_TOOLS = [
    'render_stat', 'render_kv', 'render_list', 'render_table',
    'render_chart', 'render_chart_rich', 'render_timeline', 'render_profile',
    'render_trombinoscope', 'render_hemicycle', 'render_sankey', 'render_cards',
    'render_json', 'render_d3', 'render_text', 'render_alert', 'render_code',
    'render_tags', 'render_gallery', 'render_carousel', 'render_log', 'clear_canvas',
    'update_block', 'move_block', 'resize_block', 'style_block',
  ];

  const effectiveSystemPrompt = $derived.by(() => {
    const base = systemPrompt.replace(
      '- liste tous les outils MCP et WEBMCP',
      WEBMCP_UI_TOOLS.map(t => `- ${t}`).join('\n')
    );
    const sections: string[] = [base];
    if (canvas.mcpConnected) {
      const dataTools = (canvas.mcpTools as { name: string; description?: string }[])
        .filter(t => !t.name.startsWith('render_') && t.name !== 'clear_canvas');
      if (dataTools.length > 0) {
        sections.push(
          `\n--- Contexte MCP : ${canvas.mcpName ?? 'serveur connecté'} ---\n` +
          `Outils DATA disponibles :\n` +
          dataTools.map(t => `- ${t.name}${t.description ? ' : ' + t.description.split('\n')[0] : ''}`).join('\n')
        );
      }
      if (mcpRecipes.length > 0) {
        sections.push(
          `\nSkills disponibles (${mcpRecipes.length}) :\n` +
          mcpRecipes.map(r => `- ${r.name}${r.description ? ' : ' + r.description : ''}`).join('\n')
        );
      }
    }
    return sections.join('');
  });
  let drawerOpen = $state(false);
  let chatInput = $state('');
  let mcpClient = $state<McpClient | null>(null);
  let skills = $state<Skill[]>([]);

  // Drawer sub-views
  let drawerView = $state<'main' | 'paste' | 'save' | 'editSkill'>('main');
  let pasteInput = $state('');
  let saveName = $state('');
  let editingSkill = $state<Skill | null>(null);
  let editName = $state('');
  let editDesc = $state('');
  let apiKeyInput = $state('');
  let mcpToken = $state('');
  let hsUrlDisplay = $state('');
  let urlCopied = $state(false);
  let shareMenuOpen = $state(false);
  let includeSummary = $state(true);
  let allToolsUsed = $state<string[]>([]);
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
  let maxTokens = $state(4096);
  let cacheEnabled = $state(true);

  // Gemma load timer
  let gemmaLoadStart = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  // Chat generation timer
  let chatTimer = $state(0);
  let chatTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);
  let chatToolCount = $state(0);
  let chatLastTool = $state('');

  // Console
  let consoleOpen = $state(false);
  let consoleLogs = $state<string[]>([]);
  function log(msg: string) { consoleLogs = [...consoleLogs, `[${new Date().toLocaleTimeString()}] ${msg}`]; }

  // Clock
  let clockStr = $state('');
  function tick() {
    const d = new Date();
    clockStr = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

  // ── Feed helpers ──────────────────────────────────────────────────────────
  function addBubble(role: 'user'|'assistant', html: string) {
    const item: ChatFeedItem = { kind: 'bubble', role, html, id: uid() };
    feed = [...feed, item];
    return item;
  }

  function updateBubble(id: string, html: string) {
    feed = feed.map(f => f.kind === 'bubble' && f.id === id ? { ...f, html } : f);
  }

  function addBlock(type: string, data: Record<string,unknown>, src: string) {
    const item: ChatFeedItem = { kind: 'block', id: uid(), type, data, src };
    feed = [...feed, item];
    canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data);
  }

  function clearFeedBlocks() {
    feed = feed.filter(f => f.kind === 'bubble');
    canvas.clearBlocks();
  }

  function clearChat() {
    feed = [];
    canvas.clearBlocks();
    conversationHistory = [];
  }

  // ── Skill management ──────────────────────────────────────────────────────
  function refreshSkills() { skills = listSkills(); }

  function applySkill(skill: Skill) {
    drawerOpen = false;
    clearFeedBlocks();
    addBubble('assistant', `skill <strong style="color:#7c6dfa">${skill.name}</strong> chargé${skill.mcpName ? ` · serveur: <strong style="color:#3ecfb2">${skill.mcpName}</strong>` : ''}`);

    // Auto-connect MCP if skill requires one
    if (skill.mcp && !canvas.mcpConnected) {
      // Pre-fill the URL then connect automatically
      canvas.setMcpUrl(skill.mcp);
      addBubble('assistant', `connexion automatique à <strong style="color:#f0a050">${skill.mcpName ?? skill.mcp}</strong>…`);
      // Kick off connection (don't await — non-blocking)
      void connectMcp();
    } else if (skill.mcp && canvas.mcpConnected && canvas.mcpUrl !== skill.mcp) {
      addBubble('assistant', `⚠️ Skill conçu pour <strong style="color:#f0a050">${skill.mcpName}</strong>, vous êtes sur <strong>${canvas.mcpUrl.split('/').slice(-2).join('/')}</strong>`);
    }

    skill.blocks.forEach((b, i) => {
      setTimeout(() => addBlock(b.type, b.data, skill.mcpName ?? 'skill'), i * 120);
    });
    updateHsUrl();
  }

  async function saveCurrentAsSkill() {
    if (!saveName.trim()) return;
    const blocks = canvas.blocks.map(b => ({ type: b.type, data: b.data }));
    createSkill({
      name: saveName.trim(),
      mcp: canvas.mcpUrl || undefined,
      mcpName: canvas.mcpName || undefined,
      llm: canvas.llm,
      blocks,
      tags: [],
    });
    refreshSkills();
    addBubble('assistant', `Skill <strong style="color:#7c6dfa">${saveName.trim()}</strong> sauvegardé — ${blocks.length} blocs`);
    saveName = '';
    drawerView = 'main';
  }

  async function pasteSkill() {
    const raw = pasteInput.trim();
    if (!raw) return;
    try {
      const { content: rawContent } = await decode(raw);
      const decoded = JSON.parse(rawContent) as HyperSkill;
      const content = decoded.content as { blocks?: { type: string; data: Record<string,unknown> }[] };
      clearFeedBlocks();
      addBubble('assistant', `Skill chargé depuis URL · ${content.blocks?.length ?? 0} blocs`);
      if (decoded.meta?.mcp && !canvas.mcpConnected) {
        addBubble('assistant', `Serveur requis : <strong style="color:#f0a050">${decoded.meta.mcpName ?? decoded.meta.mcp}</strong>`);
      }
      (content.blocks ?? []).forEach((b, i) => {
        setTimeout(() => addBlock(b.type, b.data, decoded.meta?.mcpName ?? 'paste'), i * 120);
      });
      pasteInput = '';
      drawerView = 'main';
      updateHsUrl();
    } catch {
      addBubble('assistant', '<span style="color:#fa6d7c">❌ Format invalide — coller une URL ?hs= ou un base64 HyperSkills</span>');
    }
  }

  function openEditSkill(skill: Skill) {
    editingSkill = skill;
    editName = skill.name;
    editDesc = skill.description ?? '';
    drawerView = 'editSkill';
  }

  function saveEditSkill() {
    if (!editingSkill) return;
    updateSkill(editingSkill.id, { name: editName, description: editDesc });
    refreshSkills();
    drawerView = 'main';
    editingSkill = null;
  }

  function removeSkill(id: string) {
    deleteSkill(id);
    refreshSkills();
  }

  // ── HyperSkill URL ────────────────────────────────────────────────────────
  async function updateHsUrl() {
    if (!canvas.blocks.length) { hsUrlDisplay = ''; return; }
    const meta: Record<string, unknown> = {
      mcp: canvas.mcpUrl || undefined,
      mcpName: canvas.mcpName || undefined,
      llm: canvas.llm,
    };

    if (includeSummary && conversationHistory.length > 0) {
      try {
        const result = await summarizeChat({
          messages: conversationHistory,
          provider: getProvider(),
          toolsUsed: allToolsUsed,
          toolCallCount: chatToolCount,
          mcpServers: mcpClient ? [canvas.mcpName ?? ''] : [],
          skillsReferenced: skills.map(s => s.name),
        });
        meta.chatSummary = result.chatSummary;
        meta.provenance = result.provenance;
      } catch { /* don't block export */ }
    }

    const skill = {
      meta,
      content: { blocks: canvas.blocks.map(b => ({ type: b.type, data: b.data })) },
    };
    const url = await encode(window.location.href.split('?')[0], JSON.stringify(skill));
    hsUrlDisplay = url;
  }

  async function copyHsUrl() {
    if (!hsUrlDisplay) { await updateHsUrl(); }
    if (!hsUrlDisplay) return;
    await navigator.clipboard.writeText(hsUrlDisplay);
    urlCopied = true;
    setTimeout(() => { urlCopied = false; }, 1500);
  }

  async function shareNative() {
    if (!hsUrlDisplay) { await updateHsUrl(); }
    if (!hsUrlDisplay) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'HyperSkills', text: 'Interface générée avec HyperSkills', url: hsUrlDisplay });
      } catch { /* user cancelled */ }
    } else {
      shareMenuOpen = !shareMenuOpen;
    }
  }

  async function ensureShareUrl(): Promise<string> {
    if (!hsUrlDisplay) await updateHsUrl();
    return hsUrlDisplay;
  }

  async function shareEmail() {
    const url = await ensureShareUrl();
    if (!url) return;
    window.open(`mailto:?subject=HyperSkills&body=${encodeURIComponent(url)}`);
  }

  async function shareTwitter() {
    const url = await ensureShareUrl();
    if (!url) return;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Interface générée avec HyperSkills')}&url=${encodeURIComponent(url)}`, '_blank');
  }

  async function shareLinkedIn() {
    const url = await ensureShareUrl();
    if (!url) return;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  }

  // ── MCP ───────────────────────────────────────────────────────────────────
  async function connectMcp() {
    const url = canvas.mcpUrl.trim();
    if (!url) return;
    drawerOpen = false;
    canvas.setMcpConnecting(true);
    log('MCP connecting: ' + url);
    addBubble('assistant', `connexion à <strong style="color:#7c6dfa">${url.split('/').slice(-2).join('/')}</strong>…`);
    try {
      const clientOptions = mcpToken.trim()
        ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } }
        : undefined;
      const client = new McpClient(url, clientOptions);
      const init = await client.connect();
      const tools = await client.listTools();
      mcpClient = client;
      canvas.setMcpConnected(true, init.serverInfo.name, tools as Parameters<typeof canvas.setMcpConnected>[2]);
      log('MCP connected: ' + tools.length + ' tools');
      addBubble('assistant', `MCP connecté · <strong style="color:#3ecfb2">${tools.length} tools</strong> disponibles`);
      // Load recipes from MCP server if available
      if ((tools as {name:string}[]).some(t => t.name === 'list_recipes')) {
        try {
          const r = await client.callTool('list_recipes', {});
          const txt = r.content?.find((c:{type:string}) => c.type === 'text') as {text?:string}|undefined;
          if (txt?.text) {
            const p: unknown = JSON.parse(txt.text);
            mcpRecipes = Array.isArray(p) ? p : ((p as {recipes?:typeof mcpRecipes})?.recipes ?? []);
          }
        } catch { /* no recipes */ }
      }
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      log('MCP error: ' + errMsg);
      canvas.setMcpError(errMsg);
      addBubble('assistant', `<span style="color:#fa6d7c">❌ ${errMsg}</span>`);
    } finally {
      canvas.setMcpConnecting(false);
    }
  }

  // ── Providers ────────────────────────────────────────────────────────────────
  let gemmaProvider = $state<GemmaProvider | null>(null);
  let gemmaStatus = $state<'idle'|'loading'|'ready'|'error'>('idle');
  let gemmaProgress = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);

  function startGemmaTimer() {
    gemmaLoadStart = Date.now();
    gemmaElapsed = 0;
    if (gemmaTimerInterval) clearInterval(gemmaTimerInterval);
    gemmaTimerInterval = setInterval(() => {
      gemmaElapsed = Math.floor((Date.now() - gemmaLoadStart) / 1000);
    }, 1000);
  }

  function stopGemmaTimer() {
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  }

  function unloadGemma() {
    if (gemmaProvider) {
      try { (gemmaProvider as unknown as { destroy?: () => void }).destroy?.(); } catch {}
      gemmaProvider = null;
    }
    gemmaStatus = 'idle';
    gemmaProgress = 0;
    stopGemmaTimer();
    addBubble('assistant', 'Gemma déchargé de la mémoire');
  }

  // ── Agent / Chat ──────────────────────────────────────────────────────────
  function getProvider() {
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      // Destroy existing provider if model changed
      if (gemmaProvider && gemmaProvider.model !== canvas.llm) {
        unloadGemma();
      }
      if (!gemmaProvider) {
        const modelLabel = canvas.llm === 'gemma-e4b' ? 'Gemma 4B' : 'Gemma 2B';
        gemmaProvider = new GemmaProvider({
          workerFactory: () => new Worker(new URL('@webmcp-auto-ui/agent/gemma-worker', import.meta.url), { type: 'module' }),
          model: canvas.llm,
          onProgress: (p, _s, loaded, total) => {
            gemmaProgress = p;
            if (loaded) gemmaLoadedMB = Math.round(loaded / 1048576 * 100) / 100;
            if (total) gemmaTotalMB = Math.round(total / 1048576 * 100) / 100;
          },
          onStatusChange: (s) => {
            gemmaStatus = s;
            if (s === 'loading') startGemmaTimer();
            if (s === 'ready') { stopGemmaTimer(); addBubble('assistant', `✓ ${modelLabel} prêt — WebGPU (${gemmaElapsed}s)`); }
            if (s === 'error') { stopGemmaTimer(); addBubble('assistant', `❌ ${modelLabel} indisponible, vérifiez WebGPU`); }
          },
        });
      }
      return gemmaProvider;
    }
    // Anthropic — key from .env or drawer input
    return new AnthropicProvider({
      proxyUrl: `${base}/api/chat`,
      model: canvas.llm,
      ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
    });
  }

  async function sendChat(msg: string) {
    // Guard: Gemma model must be ready before sending
    if ((canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') && gemmaStatus !== 'ready') {
      addBubble('user', msg);
      addBubble('assistant', `⏳ Gemma est en cours de chargement (${gemmaStatus}) — patientez…`);
      return;
    }
    addBubble('user', msg);
    const thinking = addBubble('assistant', '<span style="display:inline-flex;gap:3px;align-items:center"><span style="width:4px;height:4px;border-radius:50%;background:#7c6dfa;animation:blink 1.2s ease infinite;display:inline-block"></span><span style="width:4px;height:4px;border-radius:50%;background:#7c6dfa;animation:blink 1.2s ease infinite .2s;display:inline-block"></span><span style="width:4px;height:4px;border-radius:50%;background:#7c6dfa;animation:blink 1.2s ease infinite .4s;display:inline-block"></span></span>');
    canvas.setGenerating(true);
    chatTimer = 0; chatToolCount = 0; chatLastTool = '';
    chatTimerInterval = setInterval(() => { chatTimer++; }, 1000);
    log('→ ' + canvas.llm + ' | ' + msg.slice(0, 50));

    try {
      const result = await runAgentLoop(msg, {
        client: mcpClient ?? undefined,
        provider: getProvider(),
        systemPrompt: effectiveSystemPrompt || undefined,
        maxIterations: 15,
        maxTokens,
        cacheEnabled,
        initialMessages: trimConversationHistory(conversationHistory, maxContextTokens),
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => addBlock(type, data, 'agent'),
          onClear: () => canvas.clearBlocks(), // ne pas effacer l'historique du feed en mode chat
          onText: (text) => { if (text) updateBubble(thinking.id, text); },
          onToolCall: (call) => {
            chatToolCount++; chatLastTool = call.name;
            allToolsUsed = [...allToolsUsed, call.name];
            updateBubble(thinking.id, `🔧 <strong>${call.name}</strong>…`);
            const argsStr = JSON.stringify(call.args).slice(0, 200);
            const resultStr = (call.result ?? '').slice(0, 200);
            log(`🔧 ${call.name}(${argsStr}) → ${resultStr}${(call.result?.length ?? 0) > 200 ? '…' : ''} [${call.elapsed ?? 0}ms]`);
          },
        },
      });
      conversationHistory = result.messages; // save for next turn
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      log('❌ ' + errMsg);
      updateBubble(thinking.id, `<span style="color:#fa6d7c">❌ ${errMsg}</span>`);
    } finally {
      if (chatTimerInterval) { clearInterval(chatTimerInterval); chatTimerInterval = null; }
      log('✓ done in ' + chatTimer + 's');
      canvas.setGenerating(false);
      updateHsUrl();
    }
  }

  // ── WebMCP tools ──────────────────────────────────────────────────────────
  onMount(() => {
    tick();
    const clockInterval = setInterval(tick, 30000);
    loadDemoSkills();
    refreshSkills();

    const LLM_CONTEXT: Record<string, string> = {
      haiku: '200K tokens', sonnet: '200K tokens',
      'gemma-e2b': '~8K tokens (WASM)', 'gemma-e4b': '~8K tokens (WASM)',
    };
    log('LLM: ' + canvas.llm + ' · context: ' + (LLM_CONTEXT[canvas.llm] ?? '?'));

    // Register WebMCP tools synchronously
    const mc = (navigator as unknown as Record<string,unknown>).modelContext as {
      registerTool:(t:unknown)=>void; unregisterTool:(n:string)=>void;
    }|undefined;
    if (mc) {
      mc.registerTool({ name:'mobile_get_info', description:'Get mobile app state.',
        inputSchema:{type:'object',properties:{}},
        execute:()=>jsonResult({ mcpConnected:canvas.mcpConnected, blockCount:canvas.blockCount, skillCount:skills.length }),
        annotations:{readOnlyHint:true},
      });
      mc.registerTool({ name:'mobile_list_skills', description:'List available skills.',
        inputSchema:{type:'object',properties:{}},
        execute:()=>jsonResult(skills.map(s=>({id:s.id,name:s.name,mcp:s.mcp}))),
        annotations:{readOnlyHint:true},
      });
      mc.registerTool({ name:'mobile_apply_skill', description:'Apply a skill by ID.',
        inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']},
        execute:(args:Record<string,unknown>)=>{
          const s=skills.find(sk=>sk.id===args.id as string);
          if(!s) return textResult('Skill not found');
          applySkill(s); return textResult(`Applied: ${s.name}`);
        },
      });
      mc.registerTool({ name:'mobile_get_hyperskill_url', description:'Get current canvas as HyperSkills URL.',
        inputSchema:{type:'object',properties:{}},
        execute:()=>{ updateHsUrl(); return textResult(hsUrlDisplay||'No blocks on canvas'); },
        annotations:{readOnlyHint:true},
      });
    }

    // Load from ?hs= param (async IIFE)
    void (async () => {
      const param = new URLSearchParams(window.location.search).get('hs');
      if (param) {
        try {
          const full = window.location.href;
          const { content: rawContent } = await decode(full);
          const decoded = JSON.parse(rawContent) as HyperSkill;
          const content = decoded.content as { blocks?: { type: string; data: Record<string,unknown> }[] };
          if (decoded.meta?.mcp) canvas.setMcpUrl(decoded.meta.mcp as string);
          addBubble('assistant', `HyperSkills chargée · ${content.blocks?.length ?? 0} blocs`);
          (content.blocks ?? []).forEach((b, i) => {
            setTimeout(() => addBlock(b.type, b.data, (decoded.meta as Record<string,unknown>)?.mcpName as string ?? 'hyperskill'), i * 120);
          });
          setTimeout(() => void updateHsUrl(), 500);
        } catch {}
      } else {
        addBubble('assistant', 'Bonjour — connectez un MCP via ≡ ou demandez une interface');
      }
    })();

    return () => {
      clearInterval(clockInterval);
      if (mc) {
        ['mobile_get_info','mobile_list_skills','mobile_apply_skill','mobile_get_hyperskill_url']
          .forEach(n => { try { mc.unregisterTool(n); } catch {} });
      }
    };
  });

  // ── Gemma auto-load on selection ────────────────────────────────────────
  // untrack() évite la boucle réactive : getProvider() lit+écrit gemmaProvider,
  // et gemmaStatus est lu ET potentiellement écrit via onStatusChange dans le même cycle.
  $effect(() => {
    const llm = canvas.llm;  // seule dépendance trackée
    untrack(() => {
      if (llm === 'gemma-e2b' || llm === 'gemma-e4b') {
        const p = getProvider();
        if (gemmaStatus === 'idle' && p instanceof GemmaProvider) {
          p.initialize();
        }
      }
    });
  });
</script>

<svelte:head><title>HyperSkills Mobile</title></svelte:head>

<div class="phone">

  <!-- STATUS BAR -->
  <div class="flex items-center justify-between px-5 h-11 flex-shrink-0">
    <span class="text-[15px] font-medium text-text1 tracking-tight">{clockStr}</span>
    <div class="flex items-center gap-1.5">
      <div class="w-2 h-2 rounded-full bg-teal"></div>
      <div class="w-2.5 h-1.5 rounded-sm bg-zinc-500"></div>
      <div class="w-1 h-2 rounded-sm bg-zinc-500"></div>
    </div>
  </div>

  <!-- TOPBAR -->
  <div class="flex items-center gap-2.5 px-4 h-12 border-b border-border flex-shrink-0 bg-surface">
    <span class="text-sm font-medium text-text1 flex-1 tracking-tight">Auto<span class="text-accent">-UI</span></span>
    <McpStatus connecting={canvas.mcpConnecting} connected={canvas.mcpConnected} name={canvas.mcpName ?? 'non connecté'} />
    {#if feed.length > 0}
      <button class="w-8 h-8 rounded-lg border border-border2 flex items-center justify-center text-text2 hover:text-red-400 text-xs transition-colors"
        onclick={clearChat}
        aria-label="Effacer le chat"
        title="Effacer le chat">
        ✕
      </button>
    {/if}
    <button class="w-8 h-8 rounded-lg border border-border2 flex items-center justify-center text-text2 hover:text-text1 text-sm"
      onclick={() => {
        const root = document.documentElement;
        const current = root.dataset.theme;
        const next = current === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        try { localStorage.setItem('webmcp-theme', next); } catch {}
        import('@webmcp-auto-ui/ui').then(({ THEME_MAP }) => {
          const tokens = (THEME_MAP as Record<string, Record<string, string>>)[next];
          if (tokens) {
            for (const [key, value] of Object.entries(tokens)) {
              root.style.setProperty(`--${key}`, value);
            }
          }
        });
      }}
      aria-label="Toggle theme">
      ☀
    </button>
    <button class="w-8 h-8 rounded-lg border border-border2 flex flex-col items-center justify-center gap-1"
      onclick={() => { drawerOpen = !drawerOpen; drawerView = 'main'; }}
      aria-label="Menu">
      <div class="w-3.5 h-px bg-zinc-500 rounded"></div>
      <div class="w-3.5 h-px bg-zinc-500 rounded"></div>
      <div class="w-3.5 h-px bg-zinc-500 rounded"></div>
    </button>
  </div>

  <!-- GEMMA LOADER BAR -->
  <GemmaLoader status={gemmaStatus} progress={gemmaProgress} elapsed={gemmaElapsed}
    loadedMB={gemmaLoadedMB} totalMB={gemmaTotalMB}
    modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
    onunload={unloadGemma} />

  <!-- CHAT -->
  <ChatPanel
    showSrc
    feed={feed}
    bind:input={chatInput}
    generating={canvas.generating}
    timer={chatTimer}
    toolCount={chatToolCount}
    lastTool={chatLastTool}
    onsend={sendChat}
    placeholder="demandez une interface…"
    class="flex-1 min-h-0"
  />

  <!-- CONSOLE -->
  <AgentConsole logs={consoleLogs} bind:open={consoleOpen} />

  <!-- DRAWER -->
  <div class="drawer {drawerOpen ? 'open' : ''}">
    <div class="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-y-auto">

      {#if drawerView === 'main'}
        <!-- Header -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text1">Paramètres</span>
          <button class="text-text2 hover:text-white text-lg leading-none" onclick={() => { drawerOpen = false; }}>✕</button>
        </div>

        <!-- MCP -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Serveur MCP</div>
          <McpConnector
            url={canvas.mcpUrl}
            onurlchange={(v) => canvas.setMcpUrl(v)}
            bind:token={mcpToken}
            connecting={canvas.mcpConnecting}
            connected={canvas.mcpConnected}
            serverName={canvas.mcpName ?? ''}
            onconnect={connectMcp}
          />
        </div>

        <!-- LLM -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Modèle LLM</div>
          <LLMSelector value={canvas.llm} onchange={(v) => canvas.setLlm(v as 'haiku'|'sonnet'|'gemma-e2b'|'gemma-e4b')} class="w-full" />
        </div>

        <!-- Settings -->
        <SettingsPanel bind:systemPrompt bind:maxTokens bind:maxContextTokens bind:cacheEnabled />

        <!-- Skills -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Skills ({skills.length})</div>
          {#each skills as skill}
            <div class="flex items-center gap-1 bg-surface2 border border-border rounded-lg px-2 py-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0"></div>
              <button class="flex-1 text-left text-xs font-mono text-teal truncate" onclick={() => applySkill(skill)}>
                {skill.name}
              </button>
              {#if skill.mcp}
                <span class="text-[9px] font-mono text-text2 truncate max-w-16">{skill.mcpName ?? skill.mcp.split('/').slice(-2)[0]}</span>
              {/if}
              <button class="text-text2 hover:text-text1 text-xs px-1 flex-shrink-0" onclick={() => openEditSkill(skill)}>✏️</button>
              <button class="text-text2 hover:text-red-400 text-xs px-1 flex-shrink-0" onclick={() => removeSkill(skill.id)}>✕</button>
            </div>
          {/each}
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2 mt-auto">
          <button class="w-full py-2 rounded-lg border border-border2 text-text2 text-xs font-mono hover:border-teal hover:text-teal transition-colors"
            onclick={() => drawerView = 'paste'}>
            📋 Coller un skill HyperSkills
          </button>
          <button class="w-full py-2 rounded-lg border border-border2 text-text2 text-xs font-mono hover:border-accent hover:text-accent transition-colors"
            onclick={() => { drawerView = 'save'; }}>
            💾 Enregistrer la vue courante
          </button>
          <label class="flex items-center gap-1.5 font-mono text-[10px] text-text2 cursor-pointer">
            <input type="checkbox" bind:checked={includeSummary} class="accent-accent w-3 h-3" />
            synthèse anonymisée
          </label>
          <button class="w-full py-2 rounded-lg border border-border2 text-text2 text-xs font-mono hover:border-zinc-400 transition-colors"
            onclick={() => { updateHsUrl().then(() => { shareMenuOpen = true; }); }}>
            partager ↗
          </button>
          {#if hsUrlDisplay}
            <!-- URL preview -->
            <div class="w-full py-2 px-3 rounded-lg border border-border text-[9px] font-mono text-text2 break-all">
              {hsUrlDisplay.slice(0, 55)}…
            </div>
            <!-- Share actions -->
            {#if shareMenuOpen}
              <div class="flex flex-col gap-1.5">
                <!-- Native share (shown if available) -->
                <button
                  class="w-full py-1.5 rounded-lg border border-border2 text-text2 text-[10px] font-mono hover:border-accent hover:text-accent transition-colors"
                  onclick={shareNative}>
                  📤 Partager (natif)
                </button>
                <button
                  class="w-full py-1.5 rounded-lg border border-border2 text-text2 text-[10px] font-mono transition-colors
                    {urlCopied ? 'border-teal text-teal bg-teal/5' : 'hover:border-teal hover:text-teal'}"
                  onclick={copyHsUrl}>
                  {urlCopied ? '✓ URL copiée !' : '📋 Copier le lien'}
                </button>
                <button
                  class="w-full py-1.5 rounded-lg border border-border2 text-text2 text-[10px] font-mono hover:border-zinc-300 hover:text-text1 transition-colors"
                  onclick={shareEmail}>
                  ✉️ Email
                </button>
                <div class="flex gap-1.5">
                  <button
                    class="flex-1 py-1.5 rounded-lg border border-border2 text-text2 text-[10px] font-mono hover:border-zinc-300 hover:text-text1 transition-colors"
                    onclick={shareTwitter}>
                    𝕏 Twitter
                  </button>
                  <button
                    class="flex-1 py-1.5 rounded-lg border border-border2 text-text2 text-[10px] font-mono hover:border-blue-400 hover:text-blue-400 transition-colors"
                    onclick={shareLinkedIn}>
                    in LinkedIn
                  </button>
                </div>
              </div>
            {/if}
          {:else}
            <div class="w-full py-2 px-3 rounded-lg border border-border text-[9px] font-mono text-text2">
              HyperSkills URL — générer d'abord une interface
            </div>
          {/if}
        </div>

      {:else if drawerView === 'paste'}
        <!-- PASTE VIEW -->
        <div class="flex items-center gap-2 mb-2">
          <button class="text-text2 hover:text-white text-sm" onclick={() => drawerView = 'main'}>←</button>
          <span class="text-sm font-medium text-text1">Coller un skill HyperSkills</span>
        </div>
        <div class="text-[10px] font-mono text-text2 mb-1">URL ?hs= complète ou base64 brut</div>
        <textarea
          class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none focus:border-accent resize-none h-32"
          placeholder="https://example.com?hs=…&#10;ou base64 brut"
          bind:value={pasteInput}
        ></textarea>
        <button class="w-full py-2 rounded-lg bg-accent text-white text-xs font-mono hover:opacity-85 disabled:opacity-40"
          onclick={pasteSkill} disabled={!pasteInput.trim()}>
          Charger
        </button>

      {:else if drawerView === 'save'}
        <!-- SAVE VIEW -->
        <div class="flex items-center gap-2 mb-2">
          <button class="text-text2 hover:text-white text-sm" onclick={() => drawerView = 'main'}>←</button>
          <span class="text-sm font-medium text-text1">Enregistrer la vue</span>
        </div>
        <div class="text-[10px] font-mono text-text2 mb-1">Nom du skill</div>
        <input class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none focus:border-accent"
          placeholder="mon-skill"
          bind:value={saveName}
          onkeydown={(e) => e.key === 'Enter' && saveCurrentAsSkill()}
        />
        <div class="text-[10px] font-mono text-text2">
          {canvas.blockCount} bloc{canvas.blockCount !== 1 ? 's' : ''}
          {canvas.mcpConnected ? ` · MCP: ${canvas.mcpName}` : ''}
        </div>
        <button class="w-full py-2 rounded-lg bg-accent text-white text-xs font-mono hover:opacity-85 disabled:opacity-40 mt-auto"
          onclick={saveCurrentAsSkill} disabled={!saveName.trim() || !canvas.blockCount}>
          Enregistrer
        </button>

      {:else if drawerView === 'editSkill' && editingSkill}
        <!-- EDIT SKILL VIEW -->
        <div class="flex items-center gap-2 mb-2">
          <button class="text-text2 hover:text-white text-sm" onclick={() => { drawerView = 'main'; editingSkill = null; }}>←</button>
          <span class="text-sm font-medium text-text1">Modifier skill</span>
        </div>
        <div class="text-[10px] font-mono text-text2 mb-1">Nom</div>
        <input class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none focus:border-accent"
          bind:value={editName} />
        <div class="text-[10px] font-mono text-text2 mb-1 mt-2">Description</div>
        <input class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none focus:border-accent"
          bind:value={editDesc} />
        {#if editingSkill.mcp}
          <div class="text-[10px] font-mono text-text2 mt-2">MCP : {editingSkill.mcpName ?? editingSkill.mcp}</div>
        {/if}
        <div class="text-[10px] font-mono text-text2 mt-1">{editingSkill.blocks.length} blocs</div>
        <button class="w-full py-2 rounded-lg bg-accent text-white text-xs font-mono hover:opacity-85 mt-auto"
          onclick={saveEditSkill}>
          Sauvegarder
        </button>
      {/if}

    </div>
  </div>

</div>
