<script lang="ts">
  declare const __BUILD_TIME__: string;
  declare const __GIT_HASH__: string;

  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { WidgetRenderer, Button, Input, MarkdownView } from '@webmcp-auto-ui/ui';
  import {
    decodeHyperSkill, encodeHyperSkill, decode,
    getHsParam, type HyperSkill, type HyperSkillMeta,
  } from '@webmcp-auto-ui/sdk';
  import { parseFrontmatter } from '@webmcp-auto-ui/core';
  import { ExternalLink, Pencil, Plus, Trash2, FlaskConical, GitBranch, Github } from 'lucide-svelte';

  interface Block { id: string; type: string; data: Record<string, unknown>; }
  interface DagNode { hash: string; previousHash?: string; label: string; active: boolean; url?: string; }

  let skill = $state<HyperSkill | null>(null);
  let blocks = $state<Block[]>([]);
  let error = $state('');
  let loading = $state(true);
  let pasteUrl = $state('');
  let editingBlock = $state<string | null>(null);
  let editJson = $state('');
  let dagNodes = $state<DagNode[]>([]);
  let showDag = $state(false);

  function uid() { return 'b' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36); }

  const rawMarkdown = $derived.by(() => {
    if (!skill) return null;
    const c = skill.content as Record<string, unknown> | undefined;
    return (c && typeof c.rawMarkdown === 'string') ? c.rawMarkdown : null;
  });

  const fmMeta = $derived.by(() => {
    const m = (skill?.meta ?? {}) as Record<string, unknown>;
    return {
      when: typeof m.when === 'string' ? m.when : null,
      components_used: Array.isArray(m.components_used) ? (m.components_used as string[]) : null,
      servers: Array.isArray(m.servers) ? (m.servers as string[]) : null,
      layout: (m.layout && typeof m.layout === 'object')
        ? (m.layout as { type?: string; columns?: number; arrangement?: string })
        : null,
    };
  });

  // Try decodeHyperSkill (JSON). If it fails, fall back to raw decode + markdown/YAML parse.
  // Wraps the markdown body as a single `code` block so the existing render pipeline can consume it.
  async function decodeWithMarkdownFallback(url: string): Promise<HyperSkill> {
    try {
      return await decodeHyperSkill(url);
    } catch (jsonErr) {
      try {
        const raw = await decode(url);
        const { frontmatter, body } = parseFrontmatter(raw.content);
        return {
          meta: (frontmatter ?? {}) as HyperSkillMeta,
          content: { blocks: [], rawMarkdown: body },
        } as HyperSkill;
      } catch {
        throw jsonErr;
      }
    }
  }

  function editUrl(): string {
    const prefix = base.replace(/\/viewer$/, '');
    const hs = getHsParam(window.location.href);
    if (!hs) return `${prefix}/flex`;
    return `${prefix}/flex?hs=${encodeURIComponent(hs)}`;
  }

  function recipesUrl(): string {
    const prefix = base.replace(/\/viewer$/, '');
    const hs = getHsParam(window.location.href);
    if (!hs) return `${prefix}/recipes`;
    return `${prefix}/recipes?hs=${encodeURIComponent(hs)}`;
  }

  async function loadFromUrl(url: string) {
    const hs = getHsParam(url);
    if (!hs) {
      error = 'Aucun parametre ?hs= trouve dans cette URL';
      return;
    }
    loading = true;
    error = '';
    try {
      const decoded = await decodeWithMarkdownFallback(url);
      skill = decoded;
      blocks = extractBlocks(decoded);
      // Update browser URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('hs', hs);
      window.history.pushState({}, '', newUrl.toString());
      buildDag();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function extractBlocks(decoded: HyperSkill): Block[] {
    const content = (typeof decoded.content === 'object' && decoded.content !== null)
      ? decoded.content as Record<string, unknown> : {};
    const rawBlocks: { type: string; data: Record<string, unknown> }[] =
      Array.isArray(content.blocks) ? content.blocks
      : Array.isArray((decoded as Record<string, unknown>).blocks)
        ? (decoded as Record<string, unknown>).blocks as { type: string; data: Record<string, unknown> }[]
        : [];
    return rawBlocks.map(b => ({ id: uid(), type: b.type, data: b.data }));
  }

  function buildDag() {
    if (!skill) { dagNodes = []; return; }
    const currentHash = skill.meta?.hash;
    const prevHash = skill.meta?.previousHash;
    const nodes: DagNode[] = [];
    if (prevHash) {
      nodes.push({ hash: prevHash, label: prevHash.slice(0, 8) + '...' + prevHash.slice(-4), active: false });
    }
    if (currentHash) {
      nodes.push({ hash: currentHash, previousHash: prevHash, label: currentHash.slice(0, 8) + '...' + currentHash.slice(-4), active: true });
    }
    dagNodes = nodes;
  }

  async function handlePaste() {
    if (!pasteUrl.trim()) return;
    let url = pasteUrl.trim();
    // If user pasted just the hs param value, build a full URL
    if (!url.startsWith('http')) {
      url = window.location.origin + base + '?hs=' + encodeURIComponent(url);
    }
    await loadFromUrl(url);
    pasteUrl = '';
  }

  function createNew() {
    skill = { meta: { title: 'Nouvelle HyperSkill', version: '1' }, content: { blocks: [] } };
    blocks = [];
    error = '';
    loading = false;
    // Clear URL param
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('hs');
    window.history.pushState({}, '', newUrl.toString());
  }

  function addBlock() {
    blocks = [...blocks, { id: uid(), type: 'text', data: { text: 'Nouveau widget' } }];
    updateSkillContent();
  }

  function deleteBlock(id: string) {
    blocks = blocks.filter(b => b.id !== id);
    updateSkillContent();
  }

  function startEdit(block: Block) {
    editingBlock = block.id;
    editJson = JSON.stringify(block.data, null, 2);
  }

  function saveEdit(block: Block) {
    try {
      const parsed = JSON.parse(editJson);
      block.data = parsed;
      blocks = [...blocks]; // trigger reactivity
      editingBlock = null;
      editJson = '';
      updateSkillContent();
    } catch {
      // invalid JSON, keep editing
    }
  }

  function cancelEdit() {
    editingBlock = null;
    editJson = '';
  }

  function updateSkillContent() {
    if (!skill) return;
    const content = (typeof skill.content === 'object' && skill.content !== null)
      ? { ...skill.content as Record<string, unknown> } : {};
    content.blocks = blocks.map(b => ({ type: b.type, data: b.data }));
    skill = { ...skill, content };
  }

  async function exportUrl() {
    if (!skill) return;
    try {
      const url = await encodeHyperSkill(skill, window.location.href.split('?')[0]);
      await navigator.clipboard.writeText(url);
      alert('URL copiee dans le presse-papier');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  onMount(async () => {
    const hs = getHsParam(window.location.href);
    if (!hs) {
      loading = false;
      return;
    }
    try {
      const decoded = await decodeWithMarkdownFallback(window.location.href);
      skill = decoded;
      blocks = extractBlocks(decoded);
      buildDag();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>{skill?.meta?.title ?? 'HyperSkills Viewer'}</title></svelte:head>

<div class="min-h-screen bg-bg font-sans flex flex-col">
  <header class="border-b border-border bg-surface px-6 py-3 flex items-center gap-3 flex-shrink-0">
    <div class="font-mono text-sm font-bold">
      <span class="text-text1">Hyper</span><span class="text-accent">Skills</span>
      <span class="text-text2 text-xs ml-1">viewer</span>
    </div>
    <div class="w-px h-5 bg-border2"></div>
    {#if skill}
      <span class="font-mono text-xs text-text2 truncate">{skill.meta?.title ?? 'sans nom'}</span>
      {#if skill.meta?.description}
        <span class="hidden lg:inline text-xs text-text2 truncate max-w-md">{skill.meta.description}</span>
      {/if}
    {/if}
    <div class="flex-1"></div>
    {#if skill}
      <Button variant="outline" size="sm" class="flex items-center gap-1.5"
        onclick={() => showDag = !showDag}>
        <GitBranch size={11} /> DAG
      </Button>
      <Button variant="outline" size="sm" class="flex items-center gap-1.5"
        onclick={() => window.location.href = recipesUrl()}>
        <FlaskConical size={11} /> Tester dans Recipes
      </Button>
      <Button variant="outline" size="sm" class="flex items-center gap-1.5"
        onclick={() => window.location.href = editUrl()}>
        <Pencil size={11} /> Modifier
      </Button>
    {/if}
    <a href="https://github.com/jeanbaptiste/webmcp-auto-ui/tree/main/apps/viewer"
       target="_blank" rel="noopener"
       class="font-mono text-xs text-text2 hover:text-text1 hidden xl:inline flex items-center gap-1 transition-colors"
       title="Source code">
      <Github size={12} /> GitHub
    </a>
    <a href="https://hyperskills.net" target="_blank"
       class="font-mono text-xs text-accent hover:underline hidden xl:inline flex items-center gap-1">
      <ExternalLink size={10} /> hyperskills.net
    </a>
  </header>

  <!-- Paste URI bar -->
  <div class="border-b border-border bg-surface2 px-6 py-2 flex items-center gap-2">
    <form class="flex-1 flex items-center gap-2" onsubmit={(e) => { e.preventDefault(); handlePaste(); }}>
      <Input
        type="text"
        placeholder="Coller une URL HyperSkill (?hs=...) ou un parametre hs brut..."
        class="flex-1 font-mono text-xs h-8"
        bind:value={pasteUrl}
      />
      <Button variant="outline" size="sm" type="submit">Charger</Button>
    </form>
    <div class="w-px h-5 bg-border2"></div>
    <Button variant="outline" size="sm" class="flex items-center gap-1.5" onclick={createNew}>
      <Plus size={11} /> Nouvelle
    </Button>
    {#if skill}
      <Button variant="outline" size="sm" onclick={exportUrl}>Exporter URL</Button>
    {/if}
  </div>

  <!-- DAG panel -->
  {#if showDag && dagNodes.length > 0}
    <div class="border-b border-border bg-surface px-6 py-3">
      <div class="font-mono text-xs text-text2 mb-2 flex items-center gap-2">
        <GitBranch size={12} /> Graphe des versions (DAG)
      </div>
      <div class="flex items-center gap-0 overflow-x-auto py-2">
        {#each dagNodes as node, i (node.hash)}
          {#if i > 0}
            <svg class="flex-shrink-0" width="40" height="24" viewBox="0 0 40 24">
              <line x1="0" y1="12" x2="32" y2="12" stroke="var(--color-accent)" stroke-width="2" />
              <polygon points="32,7 40,12 32,17" fill="var(--color-accent)" />
            </svg>
          {/if}
          <button
            class="flex-shrink-0 font-mono text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer
              {node.active
                ? 'bg-accent/15 border-accent text-accent font-bold'
                : 'bg-surface2 border-border text-text2 hover:border-accent/50'}"
            onclick={() => {
              if (node.url) loadFromUrl(node.url);
            }}
            title={node.hash}
          >
            {node.label}
          </button>
        {/each}
      </div>
      {#if dagNodes.length === 1}
        <div class="font-mono text-xs text-text2 mt-1 opacity-60">Version unique (pas de previousHash)</div>
      {/if}
    </div>
  {/if}

  <main class="flex-1 flex">
    {#if loading}
      <div class="flex-1 flex items-center justify-center">
        <div class="font-mono text-sm text-text2 animate-pulse">Chargement...</div>
      </div>
    {:else if error}
      <div class="flex-1 flex items-center justify-center">
        <div class="font-mono text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-6 py-4">{error}</div>
      </div>
    {:else if !skill}
      <div class="flex-1 flex flex-col items-center justify-center text-center gap-6 p-8">
        <div class="text-5xl opacity-10">&#x2B21;</div>
        <div class="font-mono text-sm text-text2">Aucun parametre <code class="bg-surface2 px-1 rounded">?hs=</code> dans l'URL</div>
        <div class="font-mono text-xs text-text2">Collez un lien HyperSkill dans la barre ci-dessus ou creez-en une nouvelle.</div>
      </div>
    {:else}
      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4 max-w-5xl mx-auto w-full">
        <!-- Skill meta card -->
        <div class="border border-border rounded-xl p-4 bg-surface">
          <div class="font-bold text-text1 mb-1">{skill.meta?.title ?? 'sans nom'}</div>
          {#if skill.meta?.description}
            <div class="text-sm text-text2">{skill.meta.description}</div>
          {/if}
          <div class="flex gap-4 mt-2 text-xs font-mono text-text2">
            {#if skill.meta?.mcp}<span>MCP: {skill.meta.mcp}</span>{/if}
            {#if skill.meta?.hash}<span>SHA: {skill.meta.hash.slice(0, 16)}...</span>{/if}
            {#if skill.meta?.version}<span>v{skill.meta.version}</span>{/if}
          </div>
        </div>

        <!-- Raw markdown (fallback for non-JSON HyperSkills) -->
        {#if rawMarkdown}
          <div class="flex flex-col gap-4">
            {#if fmMeta.when}
              <div>
                <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">Quand utiliser</div>
                <p class="font-mono text-xs text-text1 leading-relaxed">{fmMeta.when}</p>
              </div>
            {/if}

            {#if fmMeta.components_used && fmMeta.components_used.length > 0}
              <div>
                <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Composants</div>
                <div class="flex flex-wrap gap-1.5">
                  {#each fmMeta.components_used as comp}
                    <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-accent/40 text-accent bg-accent/5">{comp}</span>
                  {/each}
                </div>
              </div>
            {/if}

            {#if fmMeta.servers && fmMeta.servers.length > 0}
              <div>
                <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Serveurs</div>
                <div class="flex flex-wrap gap-1.5">
                  {#each fmMeta.servers as server}
                    <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-teal/40 text-teal bg-teal/5">{server}</span>
                  {/each}
                </div>
              </div>
            {/if}

            {#if fmMeta.layout}
              <div>
                <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">Layout</div>
                <p class="font-mono text-xs text-text1">
                  {fmMeta.layout.type ?? ''}{#if fmMeta.layout.columns}, {fmMeta.layout.columns} colonnes{/if}{#if fmMeta.layout.arrangement} — {fmMeta.layout.arrangement}{/if}
                </p>
              </div>
            {/if}

            <div class="rounded-lg border border-border bg-surface p-6">
              <MarkdownView source={rawMarkdown} />
            </div>
          </div>
        {/if}

        <!-- Blocks -->
        {#each blocks as block (block.id)}
          <div class="rounded-lg border border-border bg-surface group relative">
            <!-- Block toolbar -->
            <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                class="p-1 rounded hover:bg-surface2 text-text2 hover:text-accent transition-colors"
                onclick={() => startEdit(block)}
                title="Modifier le widget"
              >
                <Pencil size={12} />
              </button>
              <button
                class="p-1 rounded hover:bg-surface2 text-text2 hover:text-red-400 transition-colors"
                onclick={() => deleteBlock(block.id)}
                title="Supprimer le widget"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {#if editingBlock === block.id}
              <!-- Inline editor -->
              <div class="p-4 flex flex-col gap-2">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-mono text-xs text-text2">Type:</span>
                  <input
                    class="font-mono text-xs bg-surface2 border border-border rounded px-2 py-1 text-text1 w-32"
                    value={block.type}
                    oninput={(e) => { block.type = (e.target as HTMLInputElement).value; blocks = [...blocks]; }}
                  />
                </div>
                <textarea
                  class="font-mono text-xs bg-surface2 border border-border rounded p-3 text-text1 w-full min-h-[120px] resize-y"
                  bind:value={editJson}
                ></textarea>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" onclick={() => saveEdit(block)}>Sauvegarder</Button>
                  <Button variant="ghost" size="sm" onclick={cancelEdit}>Annuler</Button>
                </div>
              </div>
            {:else}
              <WidgetRenderer type={block.type} data={block.data} />
            {/if}
          </div>
        {/each}

        <!-- Add block button -->
        <button
          class="rounded-lg border border-dashed border-border2 p-4 flex items-center justify-center gap-2
                 text-text2 hover:text-accent hover:border-accent/50 transition-colors font-mono text-xs cursor-pointer"
          onclick={addBlock}
        >
          <Plus size={14} /> Ajouter un widget
        </button>

        {#if blocks.length === 0 && skill}
          <div class="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div class="text-5xl opacity-20">&#x2B21;</div>
            <div class="font-mono text-sm text-text2">Skill chargee mais vide -- aucun widget a afficher</div>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <footer class="border-t border-border bg-surface px-6 py-2 flex items-center justify-between text-xs font-mono text-text2">
    <span class="text-[8px] text-text2/40">v1.0.0 · {__GIT_HASH__ ?? ''} · {__BUILD_TIME__?.replace('T', ' ').replace('Z', '').slice(0, 23)}</span>
    <div class="flex items-center gap-3">
      {#if skill}
        <span class="text-text2">{blocks.length} bloc{blocks.length !== 1 ? 's' : ''}</span>
        <Button variant="ghost" size="sm" class="text-accent flex items-center gap-1 h-auto px-1"
          onclick={() => window.location.href = recipesUrl()}>
          <FlaskConical size={10} /> Recipes
        </Button>
        <Button variant="ghost" size="sm" class="text-accent flex items-center gap-1 h-auto px-1"
          onclick={() => window.location.href = editUrl()}>
          <Pencil size={10} /> flex
        </Button>
      {/if}
    </div>
  </footer>
</div>
