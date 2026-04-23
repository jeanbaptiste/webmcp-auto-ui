<script lang="ts">
  // nb.hyperskills.net — entry point.
  //
  // Three behaviours:
  //   - ?hs=... or ?n=...          → decode + mount the notebook widget (legacy)
  //   - no param                   → fetch /api/p and show the index of published notebooks
  //
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { mountWidget } from '@webmcp-auto-ui/core';
  import { autoui } from '@webmcp-auto-ui/agent';
  import {
    detectIntent,
    loadFromHsParam,
    loadFromShortToken,
    extractMeta,
    NotebookLoadError,
    type NotebookPayload,
    type NotebookMeta,
  } from '$lib/notebook-loader';

  interface IndexItem {
    slug: string;
    title: string;
    description: string;
    publishedAt: number;
    updatedAt?: number;
  }

  type View =
    | { status: 'index-loading' }
    | { status: 'index'; items: IndexItem[] }
    | { status: 'index-error'; message: string }
    | { status: 'loading' }
    | { status: 'ready'; payload: NotebookPayload; meta: NotebookMeta }
    | { status: 'error'; message: string };

  let view = $state<View>({ status: 'index-loading' });
  let host = $state<HTMLDivElement | null>(null);
  let cleanup: (() => void) | null = null;

  async function boot() {
    const intent = detectIntent(window.location.href);
    if (intent.kind === 'none') {
      await loadIndex();
      return;
    }
    view = { status: 'loading' };
    try {
      const payload = intent.kind === 'hs'
        ? await loadFromHsParam(window.location.href)
        : await loadFromShortToken(intent.value);
      const meta = extractMeta(payload);
      view = { status: 'ready', payload, meta };
    } catch (err) {
      const message = err instanceof NotebookLoadError
        ? messageFor(err)
        : 'Something went wrong while loading this notebook.';
      view = { status: 'error', message };
    }
  }

  async function loadIndex() {
    view = { status: 'index-loading' };
    try {
      const res = await fetch('/api/p', { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = (await res.json()) as IndexItem[];
      view = { status: 'index', items: Array.isArray(items) ? items : [] };
    } catch (err) {
      view = { status: 'index-error', message: 'Could not load the notebook index.' };
    }
  }

  function messageFor(err: NotebookLoadError): string {
    switch (err.code) {
      case 'unsupported': return 'Only notebook widgets are supported here.';
      case 'not_found':   return 'This notebook link could not be found.';
      case 'network':     return 'Network error — please try again.';
      case 'invalid':
      default:            return 'This notebook link is invalid or expired.';
    }
  }

  // Mount the widget whenever the view becomes `ready` and the host is bound.
  $effect(() => {
    if (!browser) return;
    if (view.status !== 'ready' || !host) return;
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    host.innerHTML = '';
    const data = { ...view.payload.data, liveData: true, hideLiveToggle: true };
    const result = mountWidget(host, view.payload.kind, data, [autoui]);
    if (typeof result === 'function') cleanup = result;
    return () => {
      if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    };
  });

  onMount(() => {
    boot();
    return () => {
      if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    };
  });

  const ogTitle = $derived(
    view.status === 'ready' ? `${view.meta.title} — nb.hyperskills.net` : 'nb.hyperskills.net',
  );
  const ogDesc = $derived(
    view.status === 'ready'
      ? view.meta.description
      : 'Public notebooks shared via WebMCP.',
  );

  // Relative date formatting: "il y a 3 jours" / "2 heures".
  function formatRelative(ts: number): string {
    if (!ts) return '';
    const now = Date.now();
    const diff = Math.max(0, now - ts);
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (m < 1) return 'à l’instant';
    if (m < 60) return `il y a ${m} min`;
    if (h < 24) return `il y a ${h} h`;
    if (d < 30) return `il y a ${d} j`;
    const date = new Date(ts);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
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

{#if view.status === 'index-loading'}
  <main class="nb-page">
    <section class="nb-hero">
      <div class="nb-eyebrow">nb.hyperskills.net</div>
      <h1 class="nb-hero-title">Public <em>notebooks</em></h1>
      <p class="nb-hero-desc">Loading published notebooks…</p>
    </section>
  </main>
{:else if view.status === 'index-error'}
  <main class="nb-page">
    <section class="nb-hero">
      <div class="nb-eyebrow">nb.hyperskills.net</div>
      <h1 class="nb-hero-title">Public <em>notebooks</em></h1>
      <p class="nb-hero-desc">{view.message}</p>
    </section>
  </main>
{:else if view.status === 'index'}
  <main class="nb-page">
    <section class="nb-hero">
      <div class="nb-eyebrow">nb.hyperskills.net</div>
      <h1 class="nb-hero-title">Public <em>notebooks</em></h1>
      <p class="nb-hero-desc">
        Notebooks published via WebMCP. Each one is a live document with widgets, data and prose.
      </p>
    </section>

    {#if view.items.length === 0}
      <section class="nb-empty">
        <p>No notebook has been published yet.</p>
      </section>
    {:else}
      <section class="nb-list">
        {#each view.items as item (item.slug)}
          <a class="nb-card" href={`/${item.slug}`}>
            <h2 class="nb-card-title">{item.title}</h2>
            {#if item.description}
              <p class="nb-card-desc">{item.description}</p>
            {/if}
            <div class="nb-card-meta">
              <span class="nb-card-date">{formatRelative(item.updatedAt || item.publishedAt)}</span>
              <span class="nb-card-dot"></span>
              <span class="nb-card-slug">/{item.slug}</span>
            </div>
          </a>
        {/each}
      </section>
    {/if}
  </main>
{:else if view.status === 'loading'}
  <main class="nb-page nb-loading">
    <p>Loading notebook…</p>
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
