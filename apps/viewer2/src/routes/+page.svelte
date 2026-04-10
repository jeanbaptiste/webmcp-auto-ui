<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { BlockRenderer, Button } from '@webmcp-auto-ui/ui';
  import { decodeHyperSkill, getHsParam, type HyperSkill } from '@webmcp-auto-ui/sdk';
  import { ExternalLink, Pencil } from 'lucide-svelte';

  interface Block { id: string; type: string; data: Record<string,unknown>; }

  let skill = $state<HyperSkill | null>(null);
  let blocks = $state<Block[]>([]);
  let error = $state('');
  let loading = $state(true);

  function uid() { return 'b'+Math.random().toString(36).slice(2,8)+Date.now().toString(36); }

  function editUrl(): string {
    // Use base path for production (e.g. https://demos.hyperskills.net/flex2)
    const prefix = base.replace(/\/viewer2$/, '');
    const hs = getHsParam(window.location.href);
    if (!hs) return `${prefix}/flex2`;
    return `${prefix}/flex2?hs=${encodeURIComponent(hs)}`;
  }

  onMount(async () => {
    const hs = getHsParam(window.location.href);
    if (!hs) {
      loading = false;
      return;
    }
    try {
      const decoded = await decodeHyperSkill(window.location.href);
      skill = decoded;
      const content = (typeof decoded.content === 'object' && decoded.content !== null) ? decoded.content as Record<string, unknown> : {};
      const rawBlocks: {type:BlockType;data:Record<string,unknown>}[] =
        Array.isArray(content.blocks) ? content.blocks
        : Array.isArray((decoded as Record<string, unknown>).blocks) ? (decoded as Record<string, unknown>).blocks as {type:BlockType;data:Record<string,unknown>}[]
        : [];
      blocks = rawBlocks.map(b => ({ id: uid(), type: b.type, data: b.data }));
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
        onclick={() => window.location.href = editUrl()}>
        <Pencil size={11} /> Modifier
      </Button>
    {/if}
    <a href="https://hyperskills.net" target="_blank"
       class="font-mono text-xs text-accent hover:underline hidden xl:inline flex items-center gap-1">
      <ExternalLink size={10} /> hyperskills.net
    </a>
  </header>

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
        <div class="font-mono text-xs text-text2">Ouvrez un lien HyperSkills pour afficher le widget.</div>
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
            {#if skill.meta?.hash}<span>SHA: {skill.meta.hash.slice(0,16)}...</span>{/if}
            {#if skill.meta?.version}<span>v{skill.meta.version}</span>{/if}
          </div>
        </div>

        <!-- Blocks -->
        {#each blocks as block (block.id)}
          <div class="rounded-lg border border-border bg-surface">
            <BlockRenderer type={block.type} data={block.data} />
          </div>
        {/each}

        {#if blocks.length === 0}
          <div class="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div class="text-5xl opacity-20">&#x2B21;</div>
            <div class="font-mono text-sm text-text2">Skill chargee mais vide -- aucun bloc a afficher</div>
            <Button variant="outline" size="sm" class="flex items-center gap-1.5"
              onclick={() => window.location.href = editUrl()}>
              <Pencil size={12} /> Modifier dans flex2
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <footer class="border-t border-border bg-surface px-6 py-2 flex items-center justify-between text-xs font-mono text-text2">
    <span>viewer2 -- read-only</span>
    {#if skill}
      <Button variant="ghost" size="sm" class="text-accent flex items-center gap-1 h-auto px-1"
        onclick={() => window.location.href = editUrl()}>
        <Pencil size={10} /> Modifier dans flex2
      </Button>
    {/if}
  </footer>
</div>
