<script lang="ts">
  // Permanent published notebook: /:slug.
  // Fetches /api/p/:slug (provided by Agent H) and mounts the widget.
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { mountWidget } from '@webmcp-auto-ui/core';
  import { autoui } from '@webmcp-auto-ui/agent';
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

  $effect(() => {
    if (!browser) return;
    if (view.status !== 'ready' || !host) return;
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    host.innerHTML = '';
    // nb.hyperskills.net is always live data — hide the toggle, force live on.
    const data = { ...view.payload.data, liveData: true, hideLiveToggle: true };
    const result = mountWidget(host, view.payload.kind, data, [autoui]);
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
