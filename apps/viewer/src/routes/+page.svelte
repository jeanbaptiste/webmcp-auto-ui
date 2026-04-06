<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
  import { decodeHyperSkill, computeHash, diffSkills, type HyperSkill, type HyperSkillVersion } from '@webmcp-auto-ui/sdk';
  import { McpClient, textResult, jsonResult } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, runAgentLoop, fromMcpTools } from '@webmcp-auto-ui/agent';
  import { Link, RefreshCw, Edit, Check, X, GitBranch, Zap } from 'lucide-svelte';

  type BlockType = 'stat'|'kv'|'list'|'chart'|'alert'|'code'|'text'|'actions'|'tags'|'stat-card'|'data-table'|'timeline'|'profile'|'hemicycle'|'cards'|'json-viewer'|'sankey'|'log';
  interface Block { id: string; type: BlockType; data: Record<string,unknown>; }

  let skill = $state<HyperSkill | null>(null);
  let blocks = $state<Block[]>([]);
  let versions = $state<HyperSkillVersion[]>([]);
  let error = $state('');
  let loading = $state(false);
  let autoGenerating = $state(false);
  let urlInput = $state('');
  let editMode = $state(false);
  let editingId = $state<string|null>(null);
  let editJson = $state('');
  let statusMsg = $state('');
  let diffResult = $state<string[]>([]);
  let showDiff = $state(false);

  function uid() { return 'b'+Math.random().toString(36).slice(2,8)+Date.now().toString(36); }

  async function loadFromUrl(url: string) {
    if (!url.trim()) { error='URL vide'; return; }
    loading = true; error = '';
    try {
      const decoded = await decodeHyperSkill(url);
      const prev = skill;
      skill = decoded;
      blocks = ((decoded.content as {blocks?:{type:BlockType;data:Record<string,unknown>}[]})?.blocks ?? []).map(b => ({
        id: uid(), type: b.type, data: b.data,
      }));
      statusMsg = `Chargée : "${decoded.meta.title ?? 'sans nom'}" · ${blocks.length} blocs`;

      // Compute version
      const sourceUrl = url.includes('://') ? url.split('?')[0] : window.location.href.split('?')[0];
      const hash = await computeHash(sourceUrl, decoded.content);
      const prevHash = versions[versions.length-1]?.hash;
      versions = [...versions, { hash, previousHash: prevHash, timestamp: Date.now(), skill: decoded }];

      // Diff with previous version
      if (prev && prev.content) {
        diffResult = diffSkills(prev.content, decoded.content);
        if (diffResult.length > 0) showDiff = true;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally { loading = false; }
  }

  async function generateHsUrl() {
    const { encodeHyperSkill } = await import('@webmcp-auto-ui/sdk');
    const currentSkill: HyperSkill = {
      meta: { ...skill?.meta, title: skill?.meta?.title ?? 'viewer-export', version: new Date().toISOString() },
      content: { blocks: blocks.map(b => ({ type: b.type, data: b.data })) },
    };
    const url = await encodeHyperSkill(currentSkill);
    await navigator.clipboard.writeText(url);
    statusMsg = 'URL copiée dans le presse-papiers';
  }

  // Auto-generate from MCP
  const provider = new AnthropicProvider({ proxyUrl: `${base}/api/chat` });

  async function autoGenerate() {
    const mcpUrl = (skill?.meta as Record<string,unknown>)?.mcp as string | undefined;
    if (!mcpUrl) { statusMsg = 'Aucune URL MCP dans la skill.'; return; }
    autoGenerating = true; statusMsg = 'Connexion MCP + auto-génération…';
    try {
      const client = new McpClient(mcpUrl);
      await client.connect();
      const tools = await client.listTools();
      await runAgentLoop('Génère une interface pour les données disponibles.', {
        client,
        provider,
        mcpTools: fromMcpTools(tools),
        callbacks: {
          onBlock: (type, data) => {
            blocks = [...blocks, { id: uid(), type: type as BlockType, data }];
          },
          onClear: () => { blocks = []; },
          onText: (text) => { if (text) statusMsg = text; },
        },
      });
      statusMsg = `Interface générée — ${blocks.length} blocs`;
    } catch(e) { statusMsg = `Erreur: ${e instanceof Error ? e.message : String(e)}`; }
    finally { autoGenerating = false; }
  }

  // Edit block
  function openEdit(id: string) {
    const b = blocks.find(b => b.id === id);
    if (b) { editingId = id; editJson = JSON.stringify(b.data, null, 2); }
  }
  function saveEdit() {
    if (!editingId) return;
    try { blocks = blocks.map(b => b.id===editingId ? {...b, data: JSON.parse(editJson)} : b); editingId = null; }
    catch {}
  }

  // WebMCP tools
  onMount(() => {
    // Load from ?hs= on page load
    const param = new URLSearchParams(window.location.search).get('hs');
    if (param) { urlInput = window.location.href; loadFromUrl(window.location.href); }

    const mc = (navigator as unknown as Record<string,unknown>).modelContext as {
      registerTool:(t:unknown)=>void; unregisterTool:(n:string)=>void;
    }|undefined;
    if (!mc) return;

    mc.registerTool({ name:'get_hyperskill_info', description:'Get info about the currently loaded HyperSkills widget.',
      inputSchema:{type:'object',properties:{}},
      execute:()=>jsonResult({loaded:!!skill,title:skill?.meta?.title,blocks:blocks.length,versions:versions.length,hash:versions[versions.length-1]?.hash}),
      annotations:{readOnlyHint:true},
    });
    mc.registerTool({ name:'load_hyperskill', description:'Load a HyperSkills widget from a URL or ?hs= parameter.',
      inputSchema:{type:'object',properties:{url:{type:'string'}},required:['url']},
      execute:(args:Record<string,unknown>)=>{ loadFromUrl(args.url as string); return textResult(`Loading: ${args.url}`); },
    });
    mc.registerTool({ name:'list_viewer_blocks', description:'List all rendered blocks.',
      inputSchema:{type:'object',properties:{}},
      execute:()=>jsonResult(blocks.map(b=>({id:b.id,type:b.type}))),
      annotations:{readOnlyHint:true},
    });
    mc.registerTool({ name:'auto_generate_ui', description:'Auto-generate UI from the MCP URL in the loaded skill.',
      inputSchema:{type:'object',properties:{}},
      execute:()=>{ autoGenerate(); return textResult('Auto-generation started'); },
    });

    return () => {
      ['get_hyperskill_info','load_hyperskill','list_viewer_blocks','auto_generate_ui']
        .forEach(n => { try { mc.unregisterTool(n); } catch {} });
    };
  });
</script>

<svelte:head><title>HyperSkills Viewer</title></svelte:head>

<div class="min-h-screen bg-bg font-sans flex flex-col">
  <header class="border-b border-border bg-surface px-6 py-3 flex items-center gap-3 flex-shrink-0">
    <div class="font-mono text-sm font-bold"><span class="text-white">Hyper</span><span class="text-amber">Skills</span><span class="text-zinc-700 text-xs ml-1">viewer</span></div>
    <div class="w-px h-5 bg-border2"></div>
    <input class="flex-1 font-mono text-xs bg-surface2 border border-border2 rounded px-3 h-7 text-zinc-300 outline-none focus:border-accent transition-colors placeholder-zinc-700 max-w-lg"
      placeholder="https://example.com/viewer?hs=… ou coller une URL HyperSkills"
      bind:value={urlInput} onkeydown={(e)=>e.key==='Enter'&&loadFromUrl(urlInput)} />
    <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-zinc-400 hover:border-accent hover:text-accent transition-all"
      onclick={()=>loadFromUrl(urlInput)} disabled={loading}>
      {loading ? '…' : 'charger'}
    </button>
    <div class="flex-1"></div>
    <span class="font-mono text-xs text-zinc-600 hidden xl:block">Une HyperSkill est un widget UI portable encodé dans une URL</span>
    <a href="https://hyperskills.net" target="_blank" class="font-mono text-xs text-accent hover:underline hidden xl:inline">hyperskills.net</a>
    <div class="w-px h-5 bg-border2 hidden xl:block"></div>
    {#if skill}
      <button class="font-mono text-xs h-7 px-3 rounded border transition-all flex items-center gap-1.5
          {autoGenerating ? 'border-amber text-amber' : 'border-border2 text-zinc-400 hover:border-amber hover:text-amber'}"
        onclick={autoGenerate} disabled={autoGenerating}>
        <Zap size={11} /> {autoGenerating ? 'génération…' : 'auto-générer'}
      </button>
      <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-zinc-400 hover:border-accent hover:text-accent flex items-center gap-1.5"
        onclick={generateHsUrl}>
        <Link size={11} /> copier URL
      </button>
      <button class="font-mono text-xs h-7 px-3 rounded border transition-all flex items-center gap-1.5
          {editMode ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-zinc-400 hover:border-accent hover:text-accent'}"
        onclick={()=>editMode=!editMode}>
        <Edit size={11} /> {editMode ? 'lecture' : 'éditer'}
      </button>
    {/if}
  </header>

  {#if statusMsg}
    <div class="px-6 py-2 bg-surface border-b border-border text-xs font-mono text-zinc-500 flex items-center gap-2">
      <span>{statusMsg}</span>
      {#if versions.length > 1}
        <button class="text-[#7c6dfa] hover:underline flex items-center gap-1" onclick={()=>showDiff=!showDiff}>
          <GitBranch size={10} /> {versions.length} versions
        </button>
      {/if}
    </div>
  {/if}

  {#if showDiff && diffResult.length > 0}
    <div class="px-6 py-2 bg-amber/5 border-b border-amber/20 text-xs font-mono text-amber flex items-center gap-2">
      Diff avec version précédente : {diffResult.join(', ')} modifié(s)
      <button onclick={()=>showDiff=false} class="ml-auto text-zinc-500 hover:text-white"><X size={12} /></button>
    </div>
  {/if}

  <main class="flex-1 flex">
    {#if !skill && !loading && !error}
      <div class="flex-1 flex flex-col items-center justify-center text-center gap-6 p-8">
        <div class="text-5xl opacity-10">⬡</div>
        <div class="font-mono text-sm text-zinc-600">Collez une HyperSkills URL dans la barre ci-dessus</div>
        <div class="font-mono text-xs text-zinc-700">Format : https://example.com/viewer?hs=base64(skill)</div>
      </div>
    {:else if error}
      <div class="flex-1 flex items-center justify-center">
        <div class="font-mono text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-6 py-4">{error}</div>
      </div>
    {:else if loading}
      <div class="flex-1 flex items-center justify-center">
        <div class="font-mono text-sm text-zinc-500 animate-pulse">Chargement…</div>
      </div>
    {:else}
      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <!-- Skill meta -->
        {#if skill?.meta?.title}
          <div class="border border-border rounded-xl p-4 bg-surface">
            <div class="font-bold text-zinc-200 mb-1">{skill.meta.title}</div>
            {#if skill.meta.description}<div class="text-sm text-zinc-500">{skill.meta.description}</div>{/if}
            <div class="flex gap-4 mt-2 text-xs font-mono text-zinc-600">
              {#if skill.meta.mcp}<span>MCP: {skill.meta.mcp}</span>{/if}
              {#if skill.meta.hash}<span>SHA: {skill.meta.hash.slice(0,16)}…</span>{/if}
            </div>
          </div>
        {/if}

        <!-- Blocks -->
        {#each blocks as block (block.id)}
          <div class="relative group rounded-lg border border-border bg-surface hover:border-border2 transition-all">
            <BlockRenderer type={block.type} data={block.data} />
            {#if editMode}
              <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-1 rounded border border-border2 bg-surface2 text-zinc-500 hover:text-white" onclick={()=>openEdit(block.id)}>
                  <Edit size={11} />
                </button>
                <button class="p-1 rounded border border-border2 bg-surface2 text-zinc-500 hover:text-red-400 hover:border-red-800" onclick={()=>blocks=blocks.filter(b=>b.id!==block.id)}>
                  <X size={11} />
                </button>
              </div>
            {/if}
          </div>
        {/each}

        {#if blocks.length === 0 && skill}
          <div class="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div class="text-3xl opacity-10">⬡</div>
            <div class="font-mono text-sm text-zinc-600">Aucun bloc dans cette HyperSkills</div>
            <button class="font-mono text-xs px-4 py-2 rounded border border-amber text-amber hover:bg-amber/10 transition-all flex items-center gap-1.5"
              onclick={autoGenerate} disabled={autoGenerating}>
              <RefreshCw size={12} /> Auto-générer depuis le MCP
            </button>
          </div>
        {/if}
      </div>

      <!-- Versions sidebar -->
      {#if versions.length > 1}
        <aside class="w-64 border-l border-border bg-surface flex flex-col flex-shrink-0">
          <div class="px-4 py-2 border-b border-border text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Versions ({versions.length})</div>
          <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {#each [...versions].reverse() as v, i}
              <div class="text-xs p-2 rounded border {i===0?'border-amber/30 bg-amber/5':'border-border bg-surface2'}">
                <div class="font-mono text-zinc-400">{new Date(v.timestamp).toLocaleTimeString()}</div>
                <div class="font-mono text-[10px] text-zinc-600 truncate">{v.hash.slice(0,16)}…</div>
                {#if v.previousHash}<div class="font-mono text-[10px] text-zinc-700">← {v.previousHash.slice(0,12)}…</div>{/if}
              </div>
            {/each}
          </div>
        </aside>
      {/if}
    {/if}
  </main>
</div>

<!-- Edit modal -->
{#if editingId}
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-surface border border-border2 rounded-xl w-[500px] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <span class="text-sm font-mono text-zinc-300">Éditer bloc</span>
        <button onclick={()=>editingId=null} class="text-zinc-500 hover:text-white"><X size={16}/></button>
      </div>
      <div class="p-5">
        <textarea class="w-full font-mono text-xs bg-black/30 border border-border text-teal rounded-lg p-3 h-48 outline-none resize-vertical leading-relaxed"
          bind:value={editJson}></textarea>
      </div>
      <div class="flex justify-end gap-3 px-5 py-4 border-t border-border">
        <button class="font-mono text-xs px-4 py-2 rounded border border-border2 text-zinc-400 hover:text-white" onclick={()=>editingId=null}>annuler</button>
        <button class="font-mono text-xs px-4 py-2 rounded bg-accent text-white hover:opacity-85" onclick={saveEdit}>sauvegarder</button>
      </div>
    </div>
  </div>
{/if}
