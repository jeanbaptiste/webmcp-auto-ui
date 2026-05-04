<script lang="ts">
  // Permanent published notebook viewer: /p/:slug.
  // Fetches /api/p/:slug → HyperSkill markdown, converts it to a notebook
  // state (cells from extractCellsFromRecipe + servers from frontmatter), then
  // mounts the full notebook widget — restoring the editorial typography,
  // server chips, prose styling and run panel from the widget itself.
  // Auto-connect of frontmatter `servers` is handled by the widget's own
  // autoConnectFrontmatterServers helper (reads globalThis.__canvasVanilla,
  // exposed by +layout.svelte).
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { mountWidget } from '@webmcp-auto-ui/core';
  import { autoui } from '@webmcp-auto-ui/agent';
  import { extractCellsFromRecipe } from '@webmcp-auto-ui/ui';
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
  let host = $state<HTMLDivElement | null>(null);
  let cleanup: (() => void) | null = null;

  async function boot(slug: string) {
    view = { status: 'loading' };
    try {
      const payload = await loadFromSlug(slug);
      const meta = extractMeta(payload);
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

  /**
   * Build the notebook widget data from a parsed HyperSkill payload.
   *  - `cells` reconstructed via extractCellsFromRecipe (drops fence ↔ cell
   *    mapping, peels @meta lines, etc.)
   *  - `servers` propagated as-is so the widget's autoConnectFrontmatterServers
   *    auto-connects them on mount.
   *  - `mode: 'view'`, `liveData: true`, `hideLiveToggle: true` mirror the
   *    previous nb.hyperskills.net behaviour.
   */
  function buildWidgetData(payload: NotebookPayload, meta: NotebookMeta) {
    const cells = extractCellsFromRecipe(payload.body);
    const servers = (payload.frontmatter.servers ?? []).map((s) => ({
      name: s.name,
      url: s.url,
    }));
    return {
      id: 'nb-' + Math.random().toString(36).slice(2, 10),
      title: meta.title,
      mode: 'view',
      autoRun: false,
      liveData: true,
      hideLiveToggle: true,
      servers,
      cells,
    };
  }

  $effect(() => {
    if (!browser) return;
    if (view.status !== 'ready' || !host) return;
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    host.innerHTML = '';
    const data = buildWidgetData(view.payload, view.meta);
    const result = mountWidget(host, 'notebook', data, [autoui]);
    if (typeof result === 'function') cleanup = result;
    return () => {
      if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    };
  });

  onMount(() => {
    const slug = $page.params.slug;
    if (slug) boot(slug);
    else view = { status: 'error', code: 'not_found', message: 'Missing slug.' };
    return () => {
      if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    };
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
  <div class="nb-viewer-host" bind:this={host}></div>
{/if}
