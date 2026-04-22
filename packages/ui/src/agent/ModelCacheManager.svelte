<script lang="ts">
  import {
    listCachedModels, clearModelCache, clearAllModelCaches, type CachedModelInfo,
    listAllStorage, deleteStorageEntry, clearAllStorage, type StorageEntry,
  } from '@webmcp-auto-ui/agent';

  interface Props {
    class?: string;
  }
  let { class: cls = '' }: Props = $props();

  let models = $state<CachedModelInfo[]>([]);
  let storage = $state<StorageEntry[]>([]);
  let usage = $state<number | null>(null);
  let quota = $state<number | null>(null);
  let loading = $state(true);
  let supported = $state(true);
  let busy = $state<string | null>(null);
  let collapsed = $state(true);

  let opfsCollapsed = $state(false);
  let cacheCollapsed = $state(true);
  let idbCollapsed = $state(true);

  const totalSize = $derived(models.reduce((s, m) => s + m.size, 0));
  const usagePct = $derived(quota && quota > 0 && usage !== null ? Math.min(100, (usage / quota) * 100) : 0);

  const opfsExtras = $derived(storage.filter((e) => e.source === 'opfs'));
  const cacheEntries = $derived(storage.filter((e) => e.source === 'cache-storage'));
  const idbEntries = $derived(storage.filter((e) => e.source === 'indexeddb'));

  const cacheTotalSize = $derived(cacheEntries.reduce((s, e) => s + e.size, 0));
  const opfsExtrasTotalSize = $derived(opfsExtras.reduce((s, e) => s + e.size, 0));

  function formatBytes(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
  }

  function formatDate(ms: number): string {
    if (!ms) return '—';
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatSize(e: StorageEntry): string {
    if (!e.sizeKnown) return 'taille inconnue';
    return formatBytes(e.size);
  }

  async function refresh() {
    loading = true;
    try {
      if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
        supported = false;
        return;
      }
      supported = true;
      const [ms, sto] = await Promise.all([listCachedModels(), listAllStorage()]);
      models = ms;
      storage = sto;
      try {
        const est = await navigator.storage.estimate();
        usage = est.usage ?? null;
        quota = est.quota ?? null;
      } catch {
        usage = null;
        quota = null;
      }
    } finally {
      loading = false;
    }
  }

  async function deleteOne(repo: string) {
    if (!confirm(`Supprimer le cache "${repo}" ?`)) return;
    busy = `opfs:${repo}`;
    try {
      await clearModelCache(repo);
      await refresh();
    } finally {
      busy = null;
    }
  }

  async function deleteAll() {
    if (!confirm(`Supprimer TOUS les modèles en cache (${models.length} repo·s, ${formatBytes(totalSize)}) ?`)) return;
    busy = '__opfs_all__';
    try {
      await clearAllModelCaches();
      await refresh();
    } finally {
      busy = null;
    }
  }

  async function deleteEntry(e: StorageEntry) {
    const label = `${e.source} · ${e.key}`;
    if (!confirm(`Supprimer ${label} ?`)) return;
    busy = `${e.source}:${e.key}`;
    try {
      await deleteStorageEntry(e);
      await refresh();
    } finally {
      busy = null;
    }
  }

  async function deleteSource(source: 'opfs' | 'cache-storage' | 'indexeddb', count: number) {
    if (!confirm(`Supprimer TOUT le ${source} (${count} entrée·s) ?`)) return;
    busy = `__${source}_all__`;
    try {
      await clearAllStorage(source);
      await refresh();
    } finally {
      busy = null;
    }
  }

  $effect(() => { refresh(); });
</script>

<div class="flex flex-col gap-2 {cls}">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex items-center gap-1 cursor-pointer select-none"
       onclick={() => collapsed = !collapsed}>
    <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Model cache (OPFS)</span>
    <span class="text-[9px] text-text2/60 font-mono">
      {#if !supported}(n/a){:else if loading}(…){:else}({models.length} · {formatBytes(totalSize)}){/if}
    </span>
    <span class="text-[10px] text-text2 ml-auto transition-transform {collapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
  </div>

  {#if !collapsed}
    <div class="text-[9px] font-mono text-text2/50 -mt-1">OPFS + Cache Storage + IndexedDB</div>

    {#if !supported}
      <div class="text-[10px] font-mono text-text2/60 p-2 border border-border2 rounded">
        OPFS indisponible dans ce navigateur.
      </div>
    {:else if loading}
      <div class="text-[10px] font-mono text-text2/60">Lecture du cache…</div>
    {:else}
      {#if quota !== null && usage !== null}
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between font-mono text-[10px] text-text2">
            <span>{formatBytes(usage)} / {formatBytes(quota)}</span>
            <span class="text-text2/60">origine entière · {usagePct.toFixed(1)}%</span>
          </div>
          <div class="h-1 bg-surface2 rounded overflow-hidden">
            <div class="h-full bg-teal transition-all" style="width: {usagePct}%"></div>
          </div>
        </div>
      {/if}

      <!-- ── LLM models (OPFS webmcp-models) ───────────────────────────── -->
      <div class="flex flex-col gap-1">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="flex items-center gap-1 cursor-pointer select-none"
             onclick={() => opfsCollapsed = !opfsCollapsed}>
          <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">LLM models (OPFS)</span>
          <span class="text-[9px] text-text2/60 font-mono">({models.length} · {formatBytes(totalSize)})</span>
          <span class="text-[10px] text-text2 ml-auto transition-transform {opfsCollapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
        </div>

        {#if !opfsCollapsed}
          <div class="flex items-center justify-between">
            <span class="font-mono text-[10px] text-text2">
              Modèles : <span class="text-text1">{models.length}</span> · {formatBytes(totalSize)}
            </span>
            {#if models.length > 0}
              <button
                class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/40 text-accent2 hover:bg-accent2/10 transition-colors disabled:opacity-40"
                disabled={busy !== null}
                onclick={deleteAll}
              >
                {busy === '__opfs_all__' ? 'Suppression…' : 'Tout supprimer'}
              </button>
            {/if}
          </div>

          {#if models.length === 0}
            <div class="text-[10px] font-mono text-text2/60 p-2 border border-dashed border-border2 rounded text-center">
              Aucun modèle en cache.
            </div>
          {:else}
            <ul class="flex flex-col gap-1">
              {#each models as m (m.repo)}
                <li class="flex items-center gap-2 p-2 rounded border border-border2 bg-surface2/40">
                  <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span class="font-mono text-[11px] text-text1 truncate" title={m.repo}>{m.repo}</span>
                    <span class="font-mono text-[9px] text-text2/60">
                      {formatBytes(m.size)} · {m.fileCount} fichier{m.fileCount > 1 ? 's' : ''} · {formatDate(m.lastModified)}
                    </span>
                  </div>
                  <button
                    class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/30 text-accent2 hover:bg-accent2/10 transition-colors disabled:opacity-40 flex-shrink-0"
                    disabled={busy !== null}
                    onclick={() => deleteOne(m.repo)}
                    title="Supprimer ce cache"
                  >
                    {busy === `opfs:${m.repo}` ? '…' : 'Supprimer'}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}

          {#if opfsExtras.length > 0}
            <div class="text-[9px] font-mono text-text2/50 mt-1">Autres OPFS : {opfsExtras.length} · {formatBytes(opfsExtrasTotalSize)}</div>
            <ul class="flex flex-col gap-1">
              {#each opfsExtras as e (e.key)}
                <li class="flex items-center gap-2 p-2 rounded border border-border2 bg-surface2/40">
                  <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span class="font-mono text-[11px] text-text1 truncate flex items-center gap-1" title={e.key}>
                      {#if e.modelLike}<span class="text-accent text-[9px]">model</span>{/if}
                      {e.key}
                    </span>
                    <span class="font-mono text-[9px] text-text2/60">
                      {formatSize(e)} · {e.itemCount} fichier{e.itemCount > 1 ? 's' : ''} · {formatDate(e.lastModified)}
                    </span>
                  </div>
                  <button
                    class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/30 text-accent2 hover:bg-accent2/10 transition-colors disabled:opacity-40 flex-shrink-0"
                    disabled={busy !== null}
                    onclick={() => deleteEntry(e)}
                    title="Supprimer ce répertoire OPFS"
                  >
                    {busy === `opfs:${e.key}` ? '…' : 'Supprimer'}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      </div>

      <!-- ── Cache Storage ─────────────────────────────────────────────── -->
      <div class="flex flex-col gap-1">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="flex items-center gap-1 cursor-pointer select-none"
             onclick={() => cacheCollapsed = !cacheCollapsed}>
          <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Cache Storage</span>
          <span class="text-[9px] text-text2/60 font-mono">({cacheEntries.length} · {formatBytes(cacheTotalSize)})</span>
          <span class="text-[10px] text-text2 ml-auto transition-transform {cacheCollapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
        </div>

        {#if !cacheCollapsed}
          <div class="flex items-center justify-between">
            <span class="font-mono text-[10px] text-text2">
              Caches : <span class="text-text1">{cacheEntries.length}</span> · {formatBytes(cacheTotalSize)}
            </span>
            {#if cacheEntries.length > 0}
              <button
                class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/40 text-accent2 hover:bg-accent2/10 transition-colors disabled:opacity-40"
                disabled={busy !== null}
                onclick={() => deleteSource('cache-storage', cacheEntries.length)}
              >
                {busy === '__cache-storage_all__' ? 'Suppression…' : 'Tout supprimer'}
              </button>
            {/if}
          </div>

          {#if cacheEntries.length === 0}
            <div class="text-[10px] font-mono text-text2/60 p-2 border border-dashed border-border2 rounded text-center">
              Aucun cache.
            </div>
          {:else}
            <ul class="flex flex-col gap-1">
              {#each cacheEntries as e (e.key)}
                <li class="flex items-center gap-2 p-2 rounded border border-border2 bg-surface2/40">
                  <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span class="font-mono text-[11px] text-text1 truncate flex items-center gap-1" title={e.key}>
                      {#if e.modelLike}<span class="text-accent text-[9px]">model</span>{/if}
                      {e.key}
                    </span>
                    <span class="font-mono text-[9px] text-text2/60">
                      {formatSize(e)} · {e.itemCount} item{e.itemCount > 1 ? 's' : ''} · {formatDate(e.lastModified)}
                    </span>
                  </div>
                  <button
                    class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/30 text-accent2 hover:bg-accent2/10 transition-colors disabled:opacity-40 flex-shrink-0"
                    disabled={busy !== null}
                    onclick={() => deleteEntry(e)}
                    title="Supprimer ce cache"
                  >
                    {busy === `cache-storage:${e.key}` ? '…' : 'Supprimer'}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      </div>

      <!-- ── IndexedDB ─────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-1">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="flex items-center gap-1 cursor-pointer select-none"
             onclick={() => idbCollapsed = !idbCollapsed}>
          <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">IndexedDB</span>
          <span class="text-[9px] text-text2/60 font-mono">({idbEntries.length})</span>
          <span class="text-[10px] text-text2 ml-auto transition-transform {idbCollapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
        </div>

        {#if !idbCollapsed}
          <div class="flex items-center justify-between">
            <span class="font-mono text-[10px] text-text2">
              Bases : <span class="text-text1">{idbEntries.length}</span> · taille inconnue
            </span>
            {#if idbEntries.length > 0}
              <button
                class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/40 text-accent2 hover:bg-accent2/10 transition-colors disabled:opacity-40"
                disabled={busy !== null}
                onclick={() => deleteSource('indexeddb', idbEntries.length)}
              >
                {busy === '__indexeddb_all__' ? 'Suppression…' : 'Tout supprimer'}
              </button>
            {/if}
          </div>

          {#if idbEntries.length === 0}
            <div class="text-[10px] font-mono text-text2/60 p-2 border border-dashed border-border2 rounded text-center">
              Aucune base IndexedDB.
            </div>
          {:else}
            <ul class="flex flex-col gap-1">
              {#each idbEntries as e (e.key)}
                <li class="flex items-center gap-2 p-2 rounded border border-border2 bg-surface2/40">
                  <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span class="font-mono text-[11px] text-text1 truncate flex items-center gap-1" title={e.key}>
                      {#if e.modelLike}<span class="text-accent text-[9px]">model</span>{/if}
                      {e.key}
                    </span>
                    <span class="font-mono text-[9px] text-text2/60">
                      taille inconnue · version {e.itemCount}
                    </span>
                  </div>
                  <button
                    class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/30 text-accent2 hover:bg-accent2/10 transition-colors disabled:opacity-40 flex-shrink-0"
                    disabled={busy !== null}
                    onclick={() => deleteEntry(e)}
                    title="Supprimer cette base"
                  >
                    {busy === `indexeddb:${e.key}` ? '…' : 'Supprimer'}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>
