<script lang="ts">
  // Permanent published notebook viewer: /p/:slug.
  // Fetches /api/p/:slug → HyperSkill markdown, parses frontmatter +
  // segments client-side, auto-connects declared MCP servers via the canvas
  // store, then renders prose with <MarkdownView> and code cells with
  // <RecipeCodeBlock>. Runs flow into <RecipeRunModal> (side or inline).
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { MarkdownView, RecipeCodeBlock, RecipeRunModal } from '@webmcp-auto-ui/ui';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { runCode, type RunResult, type RunTab } from '@webmcp-auto-ui/sdk';
  import {
    loadFromSlug,
    extractMeta,
    NotebookLoadError,
    type NotebookPayload,
    type NotebookMeta,
  } from '$lib/notebook-loader';

  type View =
    | { status: 'loading' }
    | { status: 'ready'; payload: NotebookPayload; meta: NotebookMeta }
    | { status: 'error'; code: 'not_found' | 'other'; message: string };

  let view = $state<View>({ status: 'loading' });

  // Run tabs (one per executed cell). Same pattern as flex/RecipeModal.
  let runs = $state<RunTab[]>([]);
  let activeTabId = $state<string | null>(null);
  let runModalOpen = $state(false);
  // Shared scope across this notebook's code cells (top-level decls visible
  // to subsequent cells).
  let runScope = $state<Record<string, unknown>>({});

  // Responsive layout — side panel above 900px, inline below.
  let viewportW = $state(typeof window !== 'undefined' ? window.innerWidth : 1200);
  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { viewportW = window.innerWidth; };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });
  const sideBySide = $derived(viewportW >= 900);
  const showSidePanel = $derived(runModalOpen && sideBySide);
  const showInlinePanel = $derived(runModalOpen && !sideBySide);

  async function boot(slug: string) {
    view = { status: 'loading' };
    try {
      const payload = await loadFromSlug(slug);
      const meta = extractMeta(payload);
      // Auto-connect declared MCP servers. The canvas reconciler handles
      // handshake + multiClient lifecycle; idempotent — if a server with the
      // same name was already added, this re-enables it.
      const declared = payload.frontmatter.servers ?? [];
      for (const s of declared) {
        try {
          const existing = canvas.getDataServer?.(s.name);
          if (existing) {
            canvas.setDataServerEnabled?.(s.name, true);
          } else {
            canvas.addDataServer({ name: s.name, url: s.url });
          }
        } catch (err) {
          console.warn('[notebook-viewer] addDataServer failed', s, err);
        }
      }
      view = { status: 'ready', payload, meta };
    } catch (err) {
      if (err instanceof NotebookLoadError && err.code === 'not_found') {
        view = { status: 'error', code: 'not_found', message: 'Notebook not found.' };
      } else {
        const msg = err instanceof NotebookLoadError
          ? err.message
          : 'Could not load this notebook.';
        view = { status: 'error', code: 'other', message: msg };
      }
    }
  }

  // ─── Run handling ─────────────────────────────────────────────────────────

  function tabIdFor(index: number, lang: string): string {
    return `run-${index}-${lang}`;
  }
  function labelFor(index: number, lang: string): string {
    const ext = lang && lang !== 'text' ? lang : 'code';
    return `${ext}#${index + 1}`;
  }

  function handleBlockRun(index: number, payload: { code: string; lang: string; result: RunResult }) {
    const id = tabIdFor(index, payload.lang);
    const label = labelFor(index, payload.lang);
    const existing = runs.findIndex((r) => r.id === id);
    const tab: RunTab = { id, label, lang: payload.lang, code: payload.code, result: payload.result };
    if (existing >= 0) {
      runs[existing] = tab;
      runs = [...runs];
    } else {
      runs = [...runs, tab];
    }
    activeTabId = id;
    runModalOpen = true;
  }

  async function handleReplay(tabId: string) {
    const idx = runs.findIndex((r) => r.id === tabId);
    if (idx < 0) return;
    const tab = runs[idx];
    runs[idx] = {
      ...tab,
      result: { status: 'running', logs: [], startedAt: performance.now() },
    };
    runs = [...runs];
    const multi = canvas.multiClient as Parameters<typeof runCode>[2];
    const result = await runCode(tab.code, tab.lang, multi, runScope);
    runs[idx] = { ...tab, result };
    runs = [...runs];
  }

  function closeRunModal() { runModalOpen = false; }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  onMount(() => {
    if (!browser) return;
    const slug = $page.params.slug;
    if (slug) boot(slug);
    else view = { status: 'error', code: 'not_found', message: 'Missing slug.' };
  });

  const ogTitle = $derived(
    view.status === 'ready' ? `${view.meta.title} — nb.hyperskills.net` : 'Notebook — nb.hyperskills.net',
  );
  const ogDesc = $derived(
    view.status === 'ready'
      ? view.meta.description
      : 'A notebook published on nb.hyperskills.net',
  );
</script>

<svelte:head>
  <title>{ogTitle}</title>
  <meta name="description" content={ogDesc} />
  <meta property="og:title" content={ogTitle} />
  <meta property="og:description" content={ogDesc} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={ogTitle} />
  <meta name="twitter:description" content={ogDesc} />
</svelte:head>

{#if view.status === 'loading'}
  <main class="nb-page nb-loading"><p>Loading notebook…</p></main>
{:else if view.status === 'error' && view.code === 'not_found'}
  <main class="nb-page nb-error">
    <h1>404 — Notebook not found</h1>
    <p>{view.message}</p>
    <p><a href="/">← Back to index</a></p>
  </main>
{:else if view.status === 'error'}
  <main class="nb-page nb-error">
    <h1>Unable to display notebook</h1>
    <p>{view.message}</p>
    <p><a href="/">← Back to index</a></p>
  </main>
{:else}
  <div class="nb-runner-shell" class:nb-side={showSidePanel}>
    <article class="nb-runner-doc">
      {#if view.meta.title}
        <h1 class="nb-runner-title">{view.meta.title}</h1>
      {/if}
      {#if view.payload.frontmatter.servers && view.payload.frontmatter.servers.length > 0}
        <div class="nb-runner-servers">
          {#each view.payload.frontmatter.servers as srv (srv.name)}
            <span class="nb-runner-srv-chip" title={srv.url}>● {srv.name}</span>
          {/each}
        </div>
      {/if}
      <div class="nb-runner-segments">
        {#each view.payload.segments as seg, i (i)}
          {#if seg.type === 'markdown'}
            <MarkdownView source={seg.content} />
          {:else}
            <RecipeCodeBlock
              code={seg.content}
              lang={seg.lang ?? 'text'}
              scope={runScope}
              onrun={(payload) => handleBlockRun(i, payload)}
            />
          {/if}
        {/each}
      </div>

      {#if showInlinePanel}
        <div class="nb-runner-inline-panel">
          <RecipeRunModal
            open={runModalOpen}
            {runs}
            {activeTabId}
            inline={true}
            onclose={closeRunModal}
            onreplay={handleReplay}
            onselectTab={(id) => (activeTabId = id)}
          />
        </div>
      {/if}
    </article>

    {#if showSidePanel}
      <aside class="nb-runner-side-panel">
        <RecipeRunModal
          open={runModalOpen}
          {runs}
          {activeTabId}
          inline={false}
          onclose={closeRunModal}
          onreplay={handleReplay}
          onselectTab={(id) => (activeTabId = id)}
        />
      </aside>
    {/if}
  </div>
{/if}

<style>
  .nb-page {
    max-width: 720px;
    margin: 4rem auto;
    padding: 0 1.5rem;
    font-family: var(--font-sans, system-ui);
  }
  .nb-runner-shell {
    display: flex;
    gap: 1rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
  .nb-runner-shell.nb-side .nb-runner-doc { flex: 1 1 60%; min-width: 0; }
  .nb-runner-shell.nb-side .nb-runner-side-panel { flex: 1 1 40%; min-width: 0; max-height: 90vh; display: flex; }
  .nb-runner-doc { flex: 1 1 100%; min-width: 0; }
  .nb-runner-title { font-size: 1.6rem; margin: 0 0 0.6rem; }
  .nb-runner-servers { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0 0 1.2rem; }
  .nb-runner-srv-chip {
    font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--color-teal, #14b8a6);
    border: 1px solid color-mix(in srgb, currentColor 40%, transparent);
    background: color-mix(in srgb, currentColor 6%, transparent);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .nb-runner-segments { display: flex; flex-direction: column; gap: 0.6rem; }
  .nb-runner-inline-panel { margin-top: 1rem; }
</style>
