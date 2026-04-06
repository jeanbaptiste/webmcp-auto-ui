<script lang="ts">
  import { onMount } from 'svelte';
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
  let skills = $state<Skill[]>([]);

  // Drawer sub-views
  let drawerView = $state<'main' | 'paste' | 'save' | 'editSkill'>('main');
  let pasteInput = $state('');
  let saveName = $state('');
  let editingSkill = $state<Skill | null>(null);
  let editName = $state('');
  let editDesc = $state('');
  let apiKeyInput = $state('');
  let hsUrlDisplay = $state('');
  let urlCopied = $state(false);

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

    // Pre-fill MCP URL if defined
    if (skill.mcp && !canvas.mcpConnected) {
      addBubble('assistant', `Cette recette nécessite <strong style="color:#f0a050">${skill.mcpName ?? skill.mcp}</strong> — connectez via ≡`);
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
      addBubble('assistant', '<span style="color:#fa6d7c">❌ Format invalide — coller une URL ?hs= ou un base64 HyperSkill</span>');
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

  // ── MCP ───────────────────────────────────────────────────────────────────
  async function connectMcp() {
    const url = canvas.mcpUrl.trim();
    if (!url) return;
    drawerOpen = false;
    canvas.setMcpConnecting(true);
    addBubble('assistant', `connexion à <strong style="color:#7c6dfa">${url.split('/').slice(-2).join('/')}</strong>…`);
    try {
      const client = new McpClient(url);
      const init = await client.connect();
      const tools = await client.listTools();
      mcpClient = client;
      canvas.setMcpConnected(true, init.serverInfo.name, tools as Parameters<typeof canvas.setMcpConnected>[2]);
      addBubble('assistant', `MCP connecté · <strong style="color:#3ecfb2">${tools.length} tools</strong> disponibles`);
    } catch(e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
      addBubble('assistant', `<span style="color:#fa6d7c">❌ Connexion échouée</span>`);
    } finally {
      canvas.setMcpConnecting(false);
    }
  }

  // ── Providers ────────────────────────────────────────────────────────────────
  let gemmaProvider = $state<GemmaProvider | null>(null);
  let gemmaStatus = $state<'idle'|'loading'|'ready'|'error'>('idle');
  let gemmaProgress = $state(0);

  // ── Agent / Chat ──────────────────────────────────────────────────────────
  function getProvider() {
    if (canvas.llm === 'gemma-e2b') {
      if (!gemmaProvider) {
        gemmaProvider = new GemmaProvider({
          workerFactory: () => new GemmaWorker(),
          onProgress: (p, s) => { gemmaProgress = p; addBubble('assistant', `⏳ Gemma: ${s} (${Math.round(p)}%)`); },
          onStatusChange: (s) => {
            gemmaStatus = s;
            if (s === 'ready') addBubble('assistant', '✓ Gemma E2B prêt — WebGPU');
            if (s === 'error') addBubble('assistant', '❌ Gemma E2B indisponible, vérifiez WebGPU');
          },
        });
      }
      return gemmaProvider;
    }
    // Anthropic — key from .env or drawer input
    return new AnthropicProvider({
      proxyUrl: '/api/chat',
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
      mc.registerTool({ name:'mobile_get_hyperskill_url', description:'Get current canvas as HyperSkill URL.',
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
          addBubble('assistant', `HyperSkill chargée · ${content.blocks?.length ?? 0} blocs`);
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
</script>

<svelte:head><title>HyperSkill Mobile</title></svelte:head>

<div class="phone">

  <!-- STATUS BAR -->
  <div class="flex items-center justify-between px-5 h-11 flex-shrink-0">
    <span class="text-[15px] font-medium text-zinc-100 tracking-tight">{clockStr}</span>
    <div class="flex items-center gap-1.5">
      <div class="w-2 h-2 rounded-full bg-teal"></div>
      <div class="w-2.5 h-1.5 rounded-sm bg-zinc-500"></div>
      <div class="w-1 h-2 rounded-sm bg-zinc-500"></div>
    </div>
  </div>

  <!-- TOPBAR -->
  <div class="flex items-center gap-2.5 px-4 h-12 border-b border-white/7 flex-shrink-0 bg-[#16161a]">
    <span class="text-sm font-medium text-zinc-100 flex-1 tracking-tight">Hyper<span class="text-accent">Skill</span></span>
    <div class="flex items-center gap-1.5">
      <div class="w-1.5 h-1.5 rounded-full {canvas.mcpConnecting ? 'bg-amber animate-pulse' : canvas.mcpConnected ? 'bg-teal' : 'bg-zinc-700'}"></div>
      <span class="text-[10px] text-zinc-500 font-mono">{canvas.mcpConnecting ? 'connexion…' : canvas.mcpConnected ? canvas.mcpName : 'non connecté'}</span>
    </div>
    <button class="w-8 h-8 rounded-lg border border-white/12 flex flex-col items-center justify-center gap-1"
      onclick={() => { drawerOpen = !drawerOpen; drawerView = 'main'; }}
      aria-label="Menu">
      <div class="w-3.5 h-px bg-zinc-500 rounded"></div>
      <div class="w-3.5 h-px bg-zinc-500 rounded"></div>
      <div class="w-3.5 h-px bg-zinc-500 rounded"></div>
    </button>
  </div>

  <!-- FEED -->
  <div id="feed" class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
    {#each feed as item (item.id)}
      {#if item.kind === 'bubble'}
        <div class="text-xs leading-relaxed max-w-[80%] px-3 py-2 rounded-2xl
          {item.role === 'user'
            ? 'bg-accent text-white rounded-br-sm self-end'
            : 'bg-[#1e1e28] text-zinc-200 border border-white/8 rounded-bl-sm self-start'}">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html item.html}
        </div>
      {:else}
        <div class="block-anim rounded-xl border border-white/8 bg-[#16161a] overflow-hidden">
          <div class="text-[9px] font-mono text-zinc-700 px-3 pt-2 uppercase tracking-wider">{item.src}</div>
          <BlockRenderer type={item.type} data={item.data} />
        </div>
      {/if}
    {/each}
  </div>

  <!-- CHAT BAR -->
  <div class="flex items-end gap-2 px-3 py-2 border-t border-white/7 bg-[#16161a] flex-shrink-0">
    <input
      class="flex-1 bg-[#1e1e28] border border-white/10 rounded-2xl px-4 py-2 text-xs font-mono text-zinc-200 outline-none placeholder-zinc-700 focus:border-accent transition-colors"
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
          <span class="text-sm font-medium text-zinc-200">Paramètres</span>
          <button class="text-zinc-500 hover:text-white text-lg leading-none" onclick={() => { drawerOpen = false; }}>✕</button>
        </div>

        <!-- MCP -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Serveur MCP</div>
          <input class="w-full bg-[#1e1e28] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-accent"
            placeholder="https://mcp.example.com/mcp"
            bind:value={canvas.mcpUrl} />
          <button class="w-full py-2 rounded-lg bg-accent text-white text-xs font-mono hover:opacity-85 disabled:opacity-40"
            onclick={connectMcp} disabled={canvas.mcpConnecting || !canvas.mcpUrl.trim()}>
            {canvas.mcpConnecting ? 'Connexion…' : 'Connecter'}
          </button>
        </div>

        <!-- LLM -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Modèle LLM</div>
          <select class="w-full bg-[#1e1e28] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 outline-none cursor-pointer"
            value={canvas.llm} onchange={(e) => canvas.setLlm((e.target as HTMLSelectElement).value as 'haiku'|'sonnet'|'gemma-e2b')}>
            <option value="haiku">claude-haiku-4-5</option>
            <option value="sonnet">claude-sonnet-4-6</option>
            <option value="gemma-e2b">gemma-e2b (local)</option>
          </select>
        </div>

        <!-- API Key (only if no .env) -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Clé API Anthropic</div>
          <input
            class="w-full bg-[#1e1e28] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-accent"
            type="password"
            placeholder="sk-ant-… (si pas de .env)"
            bind:value={apiKeyInput}
          />
          <div class="text-[9px] font-mono text-zinc-700">Stockée en session, jamais envoyée à un tiers</div>
        </div>

        <!-- Recettes -->
        <div class="flex flex-col gap-2">
          <div class="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Recettes ({skills.length})</div>
          {#each skills as skill}
            <div class="flex items-center gap-1 bg-[#1e1e28] border border-white/7 rounded-lg px-2 py-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0"></div>
              <button class="flex-1 text-left text-xs font-mono text-teal truncate" onclick={() => applySkill(skill)}>
                {skill.name}
              </button>
              {#if skill.mcp}
                <span class="text-[9px] font-mono text-zinc-700 truncate max-w-16">{skill.mcpName ?? skill.mcp.split('/').slice(-2)[0]}</span>
              {/if}
              <button class="text-zinc-600 hover:text-zinc-300 text-xs px-1 flex-shrink-0" onclick={() => openEditSkill(skill)}>✏️</button>
              <button class="text-zinc-600 hover:text-red-400 text-xs px-1 flex-shrink-0" onclick={() => removeSkill(skill.id)}>✕</button>
            </div>
          {/each}
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2 mt-auto">
          <button class="w-full py-2 rounded-lg border border-white/12 text-zinc-400 text-xs font-mono hover:border-teal hover:text-teal transition-colors"
            onclick={() => drawerView = 'paste'}>
            📋 Coller une recette HyperSkill
          </button>
          <button class="w-full py-2 rounded-lg border border-white/12 text-zinc-400 text-xs font-mono hover:border-accent hover:text-accent transition-colors"
            onclick={() => { drawerView = 'save'; }}>
            💾 Enregistrer la vue courante
          </button>
          <button class="w-full py-2 rounded-lg border border-white/12 text-zinc-400 text-xs font-mono hover:border-zinc-400 transition-colors"
            onclick={() => { drawerOpen = false; updateHsUrl().then(() => {}); }}>
            export skill ↗
          </button>
          {#if hsUrlDisplay}
            <button
              class="w-full py-2 px-3 rounded-lg text-[9px] font-mono text-left break-all transition-colors
                {urlCopied ? 'border border-teal text-teal bg-teal/5' : 'border border-white/6 text-zinc-600 hover:border-accent'}"
              onclick={copyHsUrl}>
              {urlCopied ? '✓ URL copiée !' : hsUrlDisplay.slice(0, 55) + '…'}
            </button>
          {:else}
            <div class="w-full py-2 px-3 rounded-lg border border-white/6 text-[9px] font-mono text-zinc-700">
              HyperSkill URL — générer d'abord une interface
            </div>
          {/if}
        </div>

      {:else if drawerView === 'paste'}
        <!-- PASTE VIEW -->
        <div class="flex items-center gap-2 mb-2">
          <button class="text-zinc-500 hover:text-white text-sm" onclick={() => drawerView = 'main'}>←</button>
          <span class="text-sm font-medium text-zinc-200">Coller une recette</span>
        </div>
        <div class="text-[10px] font-mono text-zinc-600 mb-1">URL ?hs= complète ou base64 brut</div>
        <textarea
          class="w-full bg-[#1e1e28] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-accent resize-none h-32"
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
          <button class="text-zinc-500 hover:text-white text-sm" onclick={() => drawerView = 'main'}>←</button>
          <span class="text-sm font-medium text-zinc-200">Enregistrer la vue</span>
        </div>
        <div class="text-[10px] font-mono text-zinc-600 mb-1">Nom de la recette</div>
        <input class="w-full bg-[#1e1e28] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-accent"
          placeholder="ma-recette"
          bind:value={saveName}
          onkeydown={(e) => e.key === 'Enter' && saveCurrentAsSkill()}
        />
        <div class="text-[10px] font-mono text-zinc-600">
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
          <button class="text-zinc-500 hover:text-white text-sm" onclick={() => { drawerView = 'main'; editingSkill = null; }}>←</button>
          <span class="text-sm font-medium text-zinc-200">Modifier recette</span>
        </div>
        <div class="text-[10px] font-mono text-zinc-600 mb-1">Nom</div>
        <input class="w-full bg-[#1e1e28] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-accent"
          bind:value={editName} />
        <div class="text-[10px] font-mono text-zinc-600 mb-1 mt-2">Description</div>
        <input class="w-full bg-[#1e1e28] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-accent"
          bind:value={editDesc} />
        {#if editingSkill.mcp}
          <div class="text-[10px] font-mono text-zinc-600 mt-2">MCP : {editingSkill.mcpName ?? editingSkill.mcp}</div>
        {/if}
        <div class="text-[10px] font-mono text-zinc-600 mt-1">{editingSkill.blocks.length} blocs</div>
        <button class="w-full py-2 rounded-lg bg-accent text-white text-xs font-mono hover:opacity-85 mt-auto"
          onclick={saveEditSkill}>
          Sauvegarder
        </button>
      {/if}

    </div>
  </div>

</div>
