<script lang="ts">
  import { listCachedModels, clearModelCache, clearAllModelCaches, type CachedModelInfo } from '@webmcp-auto-ui/agent';

  interface Props {
    class?: string;
  }
  let { class: cls = '' }: Props = $props();

  let models = $state<CachedModelInfo[]>([]);
  let usage = $state<number | null>(null);
  let quota = $state<number | null>(null);
  let loading = $state(true);
  let supported = $state(true);
  let busy = $state<string | null>(null);

  const totalSize = $derived(models.reduce((s, m) => s + m.size, 0));
  const usagePct = $derived(quota && quota > 0 && usage !== null ? Math.min(100, (usage / quota) * 100) : 0);

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

  async function refresh() {
    loading = true;
    try {
      if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
        supported = false;
        return;
      }
      supported = true;
      models = await listCachedModels();
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
    busy = repo;
    try {
      await clearModelCache(repo);
      await refresh();
    } finally {
      busy = null;
    }
  }

  async function deleteAll() {
    if (!confirm(`Supprimer TOUS les modèles en cache (${models.length} repo·s, ${formatBytes(totalSize)}) ?`)) return;
    busy = '__all__';
    try {
      await clearAllModelCaches();
      await refresh();
    } finally {
      busy = null;
    }
  }

  $effect(() => { refresh(); });
</script>

<div class="flex flex-col gap-2 {cls}">
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
          {busy === '__all__' ? 'Suppression…' : 'Tout supprimer'}
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
              {busy === m.repo ? '…' : 'Supprimer'}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>
