<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
  import {
    loadDemoSkills, listSkills, createSkill, updateSkill, deleteSkill,
    decodeHyperSkill, encodeHyperSkill, type Skill,
  } from '@webmcp-auto-ui/sdk';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpClient, createToolGroup, jsonResult, textResult } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, GemmaProvider, runAgentLoop, fromMcpTools } from '@webmcp-auto-ui/agent';
  // Vite bundles the worker and gives us a stable URL
  import GemmaWorker from '$lib/gemma.worker.ts?worker';

  // ── State ─────────────────────────────────────────────────────────────────
  type FeedItem =
    | { kind: 'bubble'; role: 'user' | 'assistant'; html: string; id: string }
    | { kind: 'block';  id: string; type: string; data: Record<string,unknown>; src: string };

  let feed = $state<FeedItem[]>([]);
  let drawerOpen = $state(false);
  let chatInput = $state('');
  let mcpClient = $state<McpClient | null>(null);
  let mcpUrlInput = $state(canvas.mcpUrl || '');
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

  // Gemma load timer
  let gemmaLoadStart = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  // Clock
  let clockStr = $state('');
  function tick() {
    const d = new Date();
    clockStr = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

  // ── Feed helpers ──────────────────────────────────────────────────────────
  function addBubble(role: 'user'|'assistant', html: string) {
    const item: FeedItem = { kind: 'bubble', role, html, id: uid() };
    feed = [...feed, item];
    setTimeout(() => {
      const el = document.getElementById('feed');
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
    return item;
  }

  function updateBubble(id: string, html: string) {
    feed = feed.map(f => f.kind === 'bubble' && f.id === id ? { ...f, html } : f);
  }

  function addBlock(type: string, data: Record<string,unknown>, src: string) {
    const item: FeedItem = { kind: 'block', id: uid(), type, data, src };
    feed = [...feed, item];
    canvas.addBlock(type as Parameters<typeof canvas.addBlock>[0], data);
    setTimeout(() => {
      const el = document.getElementById('feed');
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }

  function clearFeedBlocks() {
    feed = feed.filter(f => f.kind === 'bubble');
    canvas.clearBlocks();
  }

  // ── Skill management ──────────────────────────────────────────────────────
  function refreshSkills() { skills = listSkills(); }

  function applySkill(skill: Skill) {
    drawerOpen = false;
    clearFeedBlocks();
    addBubble('assistant', `recette <strong style="color:#7c6dfa">${skill.name}</strong> chargée${skill.mcpName ? ` · serveur: <strong style="color:#3ecfb2">${skill.mcpName}</strong>` : ''}`);

    // Auto-connect MCP if skill requires one
    if (skill.mcp && !canvas.mcpConnected) {
      // Pre-fill the URL then connect automatically
      canvas.setMcpUrl(skill.mcp);
      addBubble('assistant', `connexion automatique à <strong style="color:#f0a050">${skill.mcpName ?? skill.mcp}</strong>…`);
      // Kick off connection (don't await — non-blocking)
      void connectMcp();
    } else if (skill.mcp && canvas.mcpConnected && canvas.mcpUrl !== skill.mcp) {
      addBubble('assistant', `⚠️ Recette conçue pour <strong style="color:#f0a050">${skill.mcpName}</strong>, vous êtes sur <strong>${canvas.mcpUrl.split('/').slice(-2).join('/')}</strong>`);
    }

    skill.blocks.forEach((b, i) => {
      setTimeout(() => addBlock(b.type, b.data, skill.mcpName ?? 'recette'), i * 120);
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
    addBubble('assistant', `Recette <strong style="color:#7c6dfa">${saveName.trim()}</strong> sauvegardée — ${blocks.length} blocs`);
    saveName = '';
    drawerView = 'main';
  }

  async function pasteSkill() {
    const raw = pasteInput.trim();
    if (!raw) return;
    try {
      const decoded = await decodeHyperSkill(raw);
      const content = decoded.content as { blocks?: { type: string; data: Record<string,unknown> }[] };
      clearFeedBlocks();
      addBubble('assistant', `Recette chargée depuis URL · ${content.blocks?.length ?? 0} blocs`);
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
    const skill = {
      meta: { mcp: canvas.mcpUrl || undefined, mcpName: canvas.mcpName || undefined, llm: canvas.llm },
      content: { blocks: canvas.blocks.map(b => ({ type: b.type, data: b.data })) },
    };
    const url = await encodeHyperSkill(skill);
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
    canvas.setMcpUrl(mcpUrlInput);
    const url = mcpUrlInput.trim();
    if (!url) return;
    drawerOpen = false;
    canvas.setMcpConnecting(true);
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
      addBubble('assistant', `MCP connecté · <strong style="color:#3ecfb2">${tools.length} tools</strong> disponibles`);
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : String(e);
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
      if (!gemmaProvider) {
        const modelLabel = canvas.llm === 'gemma-e4b' ? 'Gemma 4B' : 'Gemma 2B';
        gemmaProvider = new GemmaProvider({
          workerFactory: () => new GemmaWorker(),
          model: canvas.llm === 'gemma-e4b' ? 'onnx-community/gemma-3-1b-it-ONNX' : undefined,
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
      ...(apiKeyInput.trim() ? { apiKey: apiKeyInput.trim() } : {}),
    });
  }

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || canvas.generating) return;
    chatInput = '';

    addBubble('user', msg);
    const thinking = addBubble('assistant', '<span style="display:inline-flex;gap:3px;align-items:center"><span style="width:4px;height:4px;border-radius:50%;background:#7c6dfa;animation:blink 1.2s ease infinite;display:inline-block"></span><span style="width:4px;height:4px;border-radius:50%;background:#7c6dfa;animation:blink 1.2s ease infinite .2s;display:inline-block"></span><span style="width:4px;height:4px;border-radius:50%;background:#7c6dfa;animation:blink 1.2s ease infinite .4s;display:inline-block"></span></span>');
    canvas.setGenerating(true);

    try {
      await runAgentLoop(msg, {
        client: mcpClient ?? undefined,
        provider: getProvider(),
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onBlock: (type, data) => addBlock(type, data, 'agent'),
          onClear: clearFeedBlocks,
          onText: (text) => { if (text) updateBubble(thinking.id, text); },
          onToolCall: (call) => updateBubble(thinking.id, `🔧 <strong>${call.name}</strong>…`),
        },
      });
    } catch(e) {
      updateBubble(thinking.id, `<span style="color:#fa6d7c">❌ ${e instanceof Error ? e.message : String(e)}</span>`);
    } finally {
      canvas.setGenerating(false);
      updateHsUrl();
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') sendChat();
  }

  // ── WebMCP tools ──────────────────────────────────────────────────────────
  onMount(() => {
    tick();
    const clockInterval = setInterval(tick, 30000);
    loadDemoSkills();
    refreshSkills();

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
          const decoded = await decodeHyperSkill(full);
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
  $effect(() => {
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      const p = getProvider();
      if (gemmaStatus === 'idle' && p instanceof GemmaProvider) {
        p.initialize();
      }
    }
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
    <div class="flex items-center gap-1.5">
      <div class="w-1.5 h-1.5 rounded-full {canvas.mcpConnecting ? 'bg-amber animate-pulse' : canvas.mcpConnected ? 'bg-teal' : 'bg-zinc-700'}"></div>
      <span class="text-[10px] text-text2 font-mono">{canvas.mcpConnecting ? 'connexion…' : canvas.mcpConnected ? canvas.mcpName : 'non connecté'}</span>
    </div>
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
  {#if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') && (gemmaStatus === 'loading' || gemmaStatus === 'ready' || gemmaStatus === 'error')}
    {@const modelName = canvas.llm === 'gemma-e4b' ? 'Gemma E4B' : 'Gemma E2B'}
    {@const fmtMB = (mb: number) => mb >= 1000 ? `${(mb / 1000).toFixed(1)}GB` : `${mb.toFixed(0)}MB`}
    <div class="flex flex-col gap-1 px-4 py-2.5 border-b border-border flex-shrink-0 {gemmaStatus === 'loading' ? 'bg-accent/10' : gemmaStatus === 'ready' ? 'bg-teal/10' : 'bg-accent2/10'}">
      {#if gemmaStatus === 'loading'}
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono text-accent font-medium">
            Loading {modelName}…
            {#if gemmaTotalMB > 0}({fmtMB(gemmaLoadedMB)} / {fmtMB(gemmaTotalMB)}){:else}{Math.round(gemmaProgress)}%{/if}
          </span>
          <span class="text-[10px] font-mono text-text2">{gemmaElapsed}s</span>
        </div>
        <div class="w-full h-2 rounded-full bg-border2 overflow-hidden">
          <div class="h-full rounded-full bg-accent transition-all duration-300" style="width: {Math.max(gemmaProgress, 2)}%"></div>
        </div>
      {:else if gemmaStatus === 'ready'}
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono text-teal font-medium">{modelName} ✓ ready</span>
          <button class="text-[10px] font-mono text-text2 hover:text-accent2 transition-colors" onclick={unloadGemma}>unload ✕</button>
        </div>
      {:else if gemmaStatus === 'error'}
        <span class="text-xs font-mono text-accent2">{modelName} — load failed</span>
      {/if}
    </div>
  {/if}

  <!-- FEED -->
  <div id="feed" class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
    {#each feed as item (item.id)}
      {#if item.kind === 'bubble'}
        <div class="text-xs leading-relaxed max-w-[80%] px-3 py-2 rounded-2xl
          {item.role === 'user'
            ? 'bg-accent text-white rounded-br-sm self-end'
            : 'bg-surface2 text-text1 border border-border rounded-bl-sm self-start'}">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html item.html}
        </div>
      {:else}
        <div class="block-anim rounded-xl border border-border bg-surface overflow-hidden">
          <div class="text-[9px] font-mono text-text2 px-3 pt-2 uppercase tracking-wider">{item.src}</div>
          <BlockRenderer type={item.type} data={item.data} />
        </div>
      {/if}
    {/each}
  </div>

  <!-- CHAT BAR -->
  <div class="flex items-end gap-2 px-3 py-2 border-t border-border bg-surface flex-shrink-0">
    <input
      class="flex-1 bg-surface2 border border-border2 rounded-2xl px-4 py-2 text-xs font-mono text-text1 outline-none placeholder-zinc-700 focus:border-accent transition-colors"
      placeholder="demandez une interface…"
      bind:value={chatInput}
      onkeydown={onKeydown}
      disabled={canvas.generating}
    />
    <button
      class="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0 hover:opacity-85 disabled:opacity-40"
      onclick={sendChat}
      aria-label="Envoyer"
      disabled={canvas.generating || !chatInput.trim()}>
      <div class="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[9px] border-t-transparent border-b-transparent border-l-white ml-0.5"></div>
    </button>
  </div>

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
          <input class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none focus:border-accent"
            placeholder="https://mcp.example.com/mcp"
            bind:value={mcpUrlInput}
            oninput={() => canvas.setMcpUrl(mcpUrlInput)}
            onkeydown={(e) => e.key === 'Enter' && connectMcp()} />
          <button class="w-full py-2 rounded-lg bg-accent text-white text-xs font-mono hover:opacity-85 disabled:opacity-40"
            onclick={() => { connectMcp(); }} disabled={canvas.mcpConnecting || !canvas.mcpUrl.trim()}>
            {canvas.mcpConnecting ? 'Connexion…' : canvas.mcpConnected ? `✓ ${canvas.mcpName}` : 'Connecter'}
          </button>
        </div>

        <!-- LLM -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Modèle LLM</div>
          <select class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none cursor-pointer"
            value={canvas.llm} onchange={(e) => canvas.setLlm((e.target as HTMLSelectElement).value as 'haiku'|'sonnet'|'gemma-e2b'|'gemma-e4b')}>
            <option value="haiku">claude-haiku-4-5</option>
            <option value="sonnet">claude-sonnet-4-6</option>
            <option value="gemma-e2b">Gemma E2B (WASM)</option>
            <option value="gemma-e4b">Gemma E4B (WASM)</option>
          </select>
        </div>

        <!-- Recettes -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Recettes ({skills.length})</div>
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
            📋 Coller une recette HyperSkills
          </button>
          <button class="w-full py-2 rounded-lg border border-border2 text-text2 text-xs font-mono hover:border-accent hover:text-accent transition-colors"
            onclick={() => { drawerView = 'save'; }}>
            💾 Enregistrer la vue courante
          </button>
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
          <span class="text-sm font-medium text-text1">Coller une recette HyperSkills</span>
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
        <div class="text-[10px] font-mono text-text2 mb-1">Nom de la recette</div>
        <input class="w-full bg-surface2 border border-border2 rounded-lg px-3 py-2 text-xs font-mono text-text1 outline-none focus:border-accent"
          placeholder="ma-recette"
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
          <span class="text-sm font-medium text-text1">Modifier recette</span>
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
