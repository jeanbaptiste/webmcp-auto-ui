<script lang="ts">
  // nb.hyperskills.net — entry point.
  // Lists published notebooks from /api/p. Individual notebooks are served at
  // /p/:slug.
  import { onMount } from 'svelte';

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
    | { status: 'index-error'; message: string };

  let view = $state<View>({ status: 'index-loading' });

  async function loadIndex() {
    view = { status: 'index-loading' };
    try {
      const res = await fetch('/api/p', { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = (await res.json()) as IndexItem[];
      view = { status: 'index', items: Array.isArray(items) ? items : [] };
    } catch {
      view = { status: 'index-error', message: 'Could not load the notebook index.' };
    }
  }

  onMount(() => {
    loadIndex();
  });

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
  <title>nb.hyperskills.net</title>
  <meta name="description" content="Public notebooks shared via WebMCP." />
  <meta property="og:title" content="nb.hyperskills.net" />
  <meta property="og:description" content="Public notebooks shared via WebMCP." />
  <meta property="og:type" content="article" />
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
{:else}
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
          <a class="nb-card" href={`/p/${item.slug}`}>
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
{/if}
