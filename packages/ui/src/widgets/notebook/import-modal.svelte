<svelte:options customElement={{ tag: 'auto-import-modal', shadow: 'none' }} />

<script lang="ts">
  // ---------------------------------------------------------------------------
  // <auto-import-modal> — Custom Element Svelte 5
  // Replaces import-modals.ts (vanilla 560 l.)
  //
  // Four modal modes, controlled via `mode` prop:
  //   'add-md'        → 3 tabs: New / File / URL → emits widget:interact {action:'pick-md', payload:string}
  //   'add-recipe'    → 3 tabs: Browser / File / URL → emits widget:interact {action:'pick-recipe', payload:ImportedRecipe}
  //   'recipe-viewer' → markdown + inject buttons → emits widget:interact {action:'inject-cell', payload:NotebookCell}
  //   'tool-viewer'   → schema display → emits widget:interact {action:'inject-cells', payload:NotebookCell[]}
  //
  // All modes emit widget:interact {action:'close'} on close (in addition to the host
  // calling data.onClose or listening to the event).
  //
  // data.mcpServers, data.scope, data.recipe, data.tool are mode-specific payloads.
  // ---------------------------------------------------------------------------

  import { filterRecipes, sortRecipes, WEBMCP_RECIPES } from '@webmcp-auto-ui/agent';
  import { callToolViaPostMessage } from '@webmcp-auto-ui/core';
  import { parseBody } from '@webmcp-auto-ui/sdk';
  import MarkdownView from '../../primitives/MarkdownView.svelte';
  import RecipeCodeBlock from '../../recipe/RecipeCodeBlock.svelte';

  // ---------------------------------------------------------------------------
  // Types (inlined to avoid import-modals.ts cycle)
  // ---------------------------------------------------------------------------

  export interface ImportedRecipe {
    name: string;
    description?: string;
    body?: string;
    serverName?: string;
    serverUrl?: string;
    originalName?: string;
    id?: string;
  }

  export interface McpToolLike {
    name: string;
    description?: string;
    inputSchema?: unknown;
    schema?: unknown;
    serverName?: string;
  }

  export interface NotebookCell {
    type: string;
    content?: string;
    [k: string]: unknown;
  }

  export interface AddRecipeModalData {
    mcpServers?: Array<{ name: string; url?: string }>;
    scope?: 'data' | 'all';
  }

  export type ModalMode = 'add-md' | 'add-recipe' | 'recipe-viewer' | 'tool-viewer';

  export interface ImportModalData {
    mode?: ModalMode;
    recipe?: ImportedRecipe;
    tool?: McpToolLike;
    mcpServers?: Array<{ name: string; url?: string }>;
    scope?: 'data' | 'all';
  }

  interface Props {
    data?: ImportModalData | null;
  }

  let { data = null }: Props = $props();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let open = $state(false);
  let activeTab = $state('');
  let mdContent = $state('');
  let searchQuery = $state('');
  let urlInput = $state('');
  let fetchError = $state('');
  let recipes = $state<ImportedRecipe[]>([]);
  let filteredRecipes = $derived(filterRecipes(recipes, searchQuery));
  let sortedRecipes = $derived(sortRecipes(filteredRecipes));

  // ---------------------------------------------------------------------------
  // Derived from data
  // ---------------------------------------------------------------------------

  const mode = $derived(data?.mode ?? 'add-md');
  const recipe = $derived(data?.recipe);
  const tool = $derived(data?.tool);
  const recipeSegments = $derived(parseBody(recipe?.body ?? ''));
  const recipeCellCount = $derived(
    recipeSegments.length + ((recipe?.name || recipe?.description) ? 1 : 0),
  );

  // ---------------------------------------------------------------------------
  // Public API — called by wrapper functions
  // ---------------------------------------------------------------------------

  let hostEl: HTMLElement;

  function emitInteract(action: string, payload?: unknown) {
    hostEl?.dispatchEvent(new CustomEvent('widget:interact', {
      detail: { action, payload },
      bubbles: true,
    }));
  }

  export function openModal(newData: ImportModalData) {
    data = newData;
    activeTab = defaultTab(newData.mode ?? 'add-md');
    mdContent = '';
    searchQuery = '';
    urlInput = '';
    fetchError = '';
    recipes = [];

    if (newData.mode === 'add-recipe') {
      loadRecipes(newData);
    }
    open = true;
  }

  export function closeModal() {
    open = false;
    emitInteract('close');
  }

  function defaultTab(m: ModalMode): string {
    if (m === 'add-md') return 'new';
    if (m === 'add-recipe') return 'browser';
    return '';
  }

  // ---------------------------------------------------------------------------
  // Recipe loading (add-recipe mode)
  // ---------------------------------------------------------------------------

  async function loadRecipes(d: ImportModalData) {
    const includeBuiltin = d.scope !== 'data';
    const builtin: ImportedRecipe[] = includeBuiltin
      ? WEBMCP_RECIPES.map((r: any) => ({ name: r.name, description: r.description, body: r.body, serverName: 'webmcp' }))
      : [];

    recipes = [...builtin];

    if (!includeBuiltin && !(d.mcpServers?.length)) {
      // Will show empty state in the template
      return;
    }

    if (d.mcpServers?.length) {
      const fetches = d.mcpServers.map(async (srv) => {
        try {
          const res: any = await callToolViaPostMessage(`${srv.name}_list_recipes`, {});
          const items = extractRecipeItems(res, srv);
          if (items.length) recipes = [...recipes, ...items];
        } catch { /* ignore */ }
      });
      await Promise.allSettled(fetches);
    }
  }

  function extractRecipeItems(res: any, srv: { name: string; url?: string }): ImportedRecipe[] {
    const text = res?.content?.find?.((c: any) => c.type === 'text')?.text;
    if (!text) return [];
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { return []; }
    const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.recipes) ? parsed.recipes : []);
    return items.map((it: any) => ({
      name: String(it?.name ?? it?.id ?? 'unnamed'),
      description: it?.description,
      originalName: it?.name,
      id: it?.id,
      serverName: srv.name,
      serverUrl: srv.url,
    }));
  }

  function extractRecipeBody(res: any): string | null {
    const text = res?.content?.find?.((c: any) => c.type === 'text')?.text;
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.body === 'string') return parsed.body;
        if (typeof parsed.content === 'string') return parsed.content;
        if (typeof parsed.markdown === 'string') return parsed.markdown;
      }
    } catch { /* not JSON */ }
    return text;
  }

  // ---------------------------------------------------------------------------
  // Handlers — add-md
  // ---------------------------------------------------------------------------

  function handleInsertMd() {
    const content = mdContent.trim() === '' ? '### new section\n\nwrite here…' : mdContent;
    emitInteract('pick-md', content);
    closeModal();
  }

  async function handleMdFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    emitInteract('pick-md', text);
    closeModal();
  }

  async function handleFetchUrl() {
    fetchError = '';
    if (!urlInput.trim()) return;
    try {
      const text = await fetchViaProxy(urlInput.trim());
      if (mode === 'add-md') {
        emitInteract('pick-md', text);
      } else {
        const name = new URL(urlInput.trim()).pathname.split('/').pop() || 'recipe';
        emitInteract('pick-recipe', { name, body: text });
      }
      closeModal();
    } catch (err: any) {
      fetchError = 'Fetch failed: ' + (err?.message ?? err);
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers — add-recipe
  // ---------------------------------------------------------------------------

  async function handlePickRecipe(r: ImportedRecipe) {
    // Fetch body on demand if missing
    if (!r.body && r.serverName && r.serverName !== 'webmcp') {
      try {
        const res: any = await callToolViaPostMessage(
          `${r.serverName}_get_recipe`,
          { name: r.originalName ?? r.name, id: r.id ?? r.name },
        );
        r = { ...r, body: extractRecipeBody(res) ?? '' };
      } catch { /* keep empty body */ }
    }
    emitInteract('pick-recipe', r);
    closeModal();
  }

  async function handleRecipeFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    emitInteract('pick-recipe', { name: file.name.replace(/\.md$/, ''), body: text });
    closeModal();
  }

  // ---------------------------------------------------------------------------
  // Handlers — recipe-viewer
  // ---------------------------------------------------------------------------

  function handleInjectAll() {
    // Notebook owns extractCellsFromRecipe to avoid a ui<->notebook cycle.
    emitInteract('inject-all', { recipe: recipe });
    closeModal();
  }

  function handleInjectFence(content: string, lang: string) {
    emitInteract('inject-fence', { lang, content });
  }

  // ---------------------------------------------------------------------------
  // Handlers — tool-viewer
  // ---------------------------------------------------------------------------

  function handleInjectTool() {
    emitInteract('inject-tool', { tool });
    closeModal();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async function fetchViaProxy(url: string): Promise<string> {
    try {
      const prox = `/api/proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(prox);
      if (res.ok) return await res.text();
    } catch { /* fallback */ }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  function escapeHtml(s: string): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toolSchema(): string {
    const schema = tool?.inputSchema ?? (tool as any)?.schema ?? {};
    return JSON.stringify(schema, null, 2);
  }
</script>

<!-- Overlay -->
{#if open}
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="nb-import-overlay"
  bind:this={hostEl}
  onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
>
  <div class="nb-import-modal">

    <!-- ================================================================ -->
    <!-- add-md -->
    <!-- ================================================================ -->
    {#if mode === 'add-md'}
      <header class="nb-imp-head">
        <span class="nb-imp-title">Add markdown</span>
        <button type="button" class="nb-imp-close" onclick={closeModal}>×</button>
      </header>
      <nav class="nb-imp-tabs">
        {#each ['new','file','url'] as tab}
          <button
            type="button"
            class="nb-imp-tab"
            class:nb-imp-tab-active={activeTab === tab}
            onclick={() => activeTab = tab}
          >{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
        {/each}
      </nav>
      <section class="nb-imp-body">
        {#if activeTab === 'new'}
          <p class="nb-imp-hint">Paste markdown below, or leave empty to create a blank cell you can edit in place.</p>
          <textarea
            class="nb-imp-md-textarea"
            placeholder={"### Heading\n\nParagraph text…"}
            rows={10}
            spellcheck={true}
            bind:value={mdContent}
            onkeydown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleInsertMd(); } }}
          ></textarea>
          <div class="nb-imp-md-actions">
            <button type="button" class="nb-imp-btn nb-imp-primary" onclick={handleInsertMd}>Insert</button>
          </div>
        {:else if activeTab === 'file'}
          <p class="nb-imp-hint">Pick a .md file from your computer.</p>
          <input type="file" accept=".md,.markdown,text/markdown,text/plain" class="nb-imp-file" onchange={handleMdFile} />
        {:else if activeTab === 'url'}
          <p class="nb-imp-hint">Fetch a markdown URL (routed through /api/proxy to avoid CORS).</p>
          <input type="url" placeholder="https://..." class="nb-imp-url" bind:value={urlInput} />
          <button type="button" class="nb-imp-btn nb-imp-primary" onclick={handleFetchUrl}>Fetch</button>
          {#if fetchError}<div class="nb-imp-error">{fetchError}</div>{/if}
        {/if}
      </section>

    <!-- ================================================================ -->
    <!-- add-recipe -->
    <!-- ================================================================ -->
    {:else if mode === 'add-recipe'}
      <header class="nb-imp-head">
        <span class="nb-imp-title">Add recipe</span>
        <button type="button" class="nb-imp-close" onclick={closeModal}>×</button>
      </header>
      <nav class="nb-imp-tabs">
        {#each ['browser','file','url'] as tab}
          <button
            type="button"
            class="nb-imp-tab"
            class:nb-imp-tab-active={activeTab === tab}
            onclick={() => activeTab = tab}
          >{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
        {/each}
      </nav>
      <section class="nb-imp-body">
        {#if activeTab === 'browser'}
          <input type="search" placeholder="Search recipes..." class="nb-imp-search" bind:value={searchQuery} />
          <div class="nb-imp-recipes">
            {#if sortedRecipes.length === 0}
              {#if !data?.mcpServers?.length && data?.scope === 'data'}
                <div class="nb-imp-empty">No data servers connected. Connect one to see recipes.</div>
              {:else}
                <div class="nb-imp-empty">No recipes.</div>
              {/if}
            {:else}
              {#each sortedRecipes as r}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="nb-imp-recipe" onclick={() => handlePickRecipe(r)}>
                  <div class="nb-imp-recipe-name">{r.name}</div>
                  {#if r.description}<div class="nb-imp-recipe-desc">{r.description}</div>{/if}
                  {#if r.serverName}<div class="nb-imp-recipe-srv">{r.serverName}</div>{/if}
                </div>
              {/each}
            {/if}
          </div>
        {:else if activeTab === 'file'}
          <p class="nb-imp-hint">Pick a .md recipe file.</p>
          <input type="file" accept=".md,.markdown,text/markdown,text/plain" class="nb-imp-file" onchange={handleRecipeFile} />
        {:else if activeTab === 'url'}
          <p class="nb-imp-hint">Fetch a recipe URL (routed through /api/proxy).</p>
          <input type="url" placeholder="https://..." class="nb-imp-url" bind:value={urlInput} />
          <button type="button" class="nb-imp-btn nb-imp-primary" onclick={handleFetchUrl}>Fetch</button>
          {#if fetchError}<div class="nb-imp-error">{fetchError}</div>{/if}
        {/if}
      </section>

    <!-- ================================================================ -->
    <!-- recipe-viewer -->
    <!-- ================================================================ -->
    {:else if mode === 'recipe-viewer'}
      <header class="nb-imp-head">
        <span class="nb-imp-title">{recipe?.name ?? ''}</span>
        <button type="button" class="nb-imp-close" onclick={closeModal}>×</button>
      </header>
      <div class="nb-imp-recipe-meta">
        {#if recipe?.description}<p>{recipe.description}</p>{/if}
        {#if recipe?.serverName}<span class="nb-imp-recipe-srv">{recipe.serverName}</span>{/if}
      </div>
      <section class="nb-imp-body nb-imp-body-recipe">
        {#each recipeSegments as seg, i (i)}
          {#if seg.type === 'markdown'}
            <MarkdownView source={seg.content} />
          {:else}
            <RecipeCodeBlock
              code={seg.content}
              lang={seg.lang ?? 'text'}
              actions={[{
                icon: '+',
                label: 'Inject as cell',
                onclick: handleInjectFence,
              }]}
            />
          {/if}
        {/each}
      </section>
      <footer class="nb-imp-foot">
        <button
          type="button"
          class="nb-imp-btn nb-imp-primary"
          onclick={handleInjectAll}
          disabled={recipeCellCount === 0}
        >Inject all cells{recipeCellCount > 0 ? ` (${recipeCellCount})` : ''}</button>
      </footer>

    <!-- ================================================================ -->
    <!-- tool-viewer -->
    <!-- ================================================================ -->
    {:else if mode === 'tool-viewer'}
      <header class="nb-imp-head">
        <span class="nb-imp-title">
          {escapeHtml(tool?.name ?? '')}
          {#if tool?.serverName}<span class="nb-imp-recipe-srv">{tool.serverName}</span>{/if}
        </span>
        <button type="button" class="nb-imp-close" onclick={closeModal}>×</button>
      </header>
      <section class="nb-imp-body nb-imp-body-tool">
        {#if tool?.description}<p class="nb-imp-tool-desc">{tool.description}</p>{/if}
        <div class="nb-imp-tool-schema">
          <div class="nb-imp-hint">input schema</div>
          <pre><code>{toolSchema()}</code></pre>
        </div>
      </section>
      <footer class="nb-imp-foot">
        <button type="button" class="nb-imp-btn nb-imp-primary" onclick={handleInjectTool}>↳ inject as cell</button>
      </footer>
    {/if}

  </div>
</div>
{/if}

<style>
  .nb-import-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nb-import-modal {
    width: min(680px, 92vw);
    max-height: 84vh;
    background: var(--color-surface, #fff);
    color: var(--color-text1, #111);
    border-radius: 14px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-sans, system-ui);
  }

  .nb-imp-head {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid var(--color-border, #eee);
  }

  .nb-imp-title {
    flex: 1;
    font-weight: 600;
    font-size: 14px;
  }

  .nb-imp-recipe-srv {
    font-family: monospace;
    font-size: 11px;
    color: var(--color-text2, #666);
    margin-left: 6px;
  }

  .nb-imp-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    color: var(--color-text2, #666);
  }

  .nb-imp-tabs {
    display: flex;
    padding: 0 14px;
    border-bottom: 1px solid var(--color-border, #eee);
  }

  .nb-imp-tab {
    background: none;
    border: none;
    cursor: pointer;
    padding: 10px 14px;
    font-size: 12px;
    color: var(--color-text2, #666);
    border-bottom: 2px solid transparent;
  }

  .nb-imp-tab-active {
    color: var(--color-text1, #111);
    border-bottom-color: var(--color-accent, #6a55ff);
  }

  .nb-imp-body {
    padding: 16px 18px;
    overflow-y: auto;
    flex: 1;
  }

  .nb-imp-body-recipe,
  .nb-imp-body-tool {
    font-size: 13px;
  }

  .nb-imp-hint {
    font-size: 12px;
    color: var(--color-text2, #666);
    margin: 0 0 10px 0;
  }

  .nb-imp-btn {
    background: var(--color-surface2, #f4f4f5);
    border: 1px solid var(--color-border, #e4e4e7);
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 12px;
    cursor: pointer;
  }

  .nb-imp-btn:hover {
    background: var(--color-surface3, #eeeef0);
  }

  .nb-imp-primary {
    background: var(--color-accent, #6a55ff);
    color: #fff;
    border: 0;
  }

  .nb-imp-primary:hover {
    filter: brightness(1.1);
    color: #fff;
  }

  .nb-imp-search,
  .nb-imp-url {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--color-border, #e4e4e7);
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 10px;
    background: var(--color-surface, #fff);
    color: var(--color-text1, #111);
    box-sizing: border-box;
  }

  .nb-imp-file {
    font-size: 12px;
  }

  .nb-imp-md-textarea {
    width: 100%;
    min-height: 180px;
    font-family: var(--font-mono, 'IBM Plex Mono', monospace);
    font-size: 13px;
    line-height: 1.5;
    padding: 10px 12px;
    border: 1px solid var(--color-border, #e4e4e7);
    border-radius: 6px;
    background: var(--color-bg, #fff);
    color: var(--color-text1, #111);
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }

  .nb-imp-md-textarea:focus {
    border-color: var(--color-accent, #6a55ff);
  }

  .nb-imp-md-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
  }

  .nb-imp-recipes {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 46vh;
    overflow-y: auto;
  }

  .nb-imp-recipe {
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    background: var(--color-surface2, #f4f4f5);
    transition: background 0.12s;
  }

  .nb-imp-recipe:hover {
    background: var(--color-surface3, #eeeef0);
  }

  .nb-imp-recipe-name {
    font-weight: 500;
    font-size: 13px;
  }

  .nb-imp-recipe-desc {
    font-size: 11.5px;
    color: var(--color-text2, #666);
    margin-top: 3px;
  }

  .nb-imp-recipe-meta {
    padding: 0 18px 10px;
    border-bottom: 1px solid var(--color-border, #eee);
  }

  .nb-imp-empty {
    color: var(--color-text2, #666);
    font-size: 12px;
    padding: 14px;
    text-align: center;
  }

  .nb-imp-foot {
    padding: 12px 18px;
    border-top: 1px solid var(--color-border, #eee);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .nb-imp-error {
    color: #c2323a;
    font-size: 12px;
    margin-top: 8px;
  }

  .nb-imp-tool-desc {
    font-size: 13px;
    margin: 0 0 10px;
  }

  .nb-imp-tool-schema pre {
    background: var(--color-surface2, #f4f4f5);
    padding: 10px;
    border-radius: 6px;
    max-height: 40vh;
    overflow: auto;
    font-size: 11.5px;
  }

</style>
