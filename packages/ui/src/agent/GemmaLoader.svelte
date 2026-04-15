<script lang="ts">
  import { fly } from 'svelte/transition';

  interface Props {
    status: 'idle' | 'loading' | 'ready' | 'error';
    progress: number;
    elapsed: number;
    loadedMB?: number;
    totalMB?: number;
    modelName?: string;
    error?: string;
    fromCache?: boolean;
    onunload?: () => void;
    oncancel?: () => void;
  }
  let {
    status,
    progress,
    elapsed,
    loadedMB = 0,
    totalMB = 0,
    modelName = 'Gemma E2B',
    error = '',
    fromCache = false,
    onunload,
    oncancel
  }: Props = $props();

  let collapsed = $state(false);
  let collapseTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);

  const fmt = (mb: number) => mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  const speed = (loaded: number, secs: number) => {
    if (secs <= 0 || loaded <= 0) return '';
    const mbps = loaded / secs;
    return mbps >= 1 ? `${mbps.toFixed(0)} MB/s` : `${(mbps * 1000).toFixed(0)} KB/s`;
  };

  // Auto-collapse 5s after ready
  $effect(() => {
    if (status === 'ready') {
      collapsed = false;
      collapseTimer = setTimeout(() => { collapsed = true; }, 5000);
    } else {
      collapsed = false;
      if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = undefined; }
    }
    return () => { if (collapseTimer) clearTimeout(collapseTimer); };
  });

  const pct = $derived(Math.round(progress));
  const barWidth = $derived(Math.max(pct, 2));
  const speedStr = $derived(speed(loadedMB ?? 0, elapsed));
</script>

{#if status !== 'idle'}
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-md w-[90vw] pointer-events-auto"
    transition:fly={{ y: 24, duration: 280 }}
  >
    {#if status === 'loading'}
      <div class="bg-surface/90 backdrop-blur-md border border-border2 rounded-xl shadow-2xl p-4 font-mono text-xs">
        <div class="flex items-center justify-between mb-2">
          <span class="text-text font-medium">🔄 Chargement {modelName}</span>
          <span class="text-text2">{pct}%</span>
        </div>
        <div class="w-full h-1.5 rounded-full bg-border2 overflow-hidden mb-2">
          <div
            class="h-full rounded-full bg-accent transition-all duration-300"
            style="width: {barWidth}%"
          ></div>
        </div>
        <div class="flex items-center justify-between text-text2">
          <span>
            {#if totalMB && totalMB > 0}
              {fmt(loadedMB ?? 0)} / {fmt(totalMB)}
            {/if}
            {#if elapsed > 0}
              {totalMB ? ' · ' : ''}{elapsed}s
            {/if}
            {#if speedStr}
              · {speedStr}
            {/if}
          </span>
          {#if oncancel}
            <button
              class="text-text2 hover:text-accent2 transition-colors ml-2"
              onclick={oncancel}
            >Annuler</button>
          {/if}
        </div>
      </div>

    {:else if status === 'ready'}
      {#if collapsed}
        <button
          class="bg-surface/90 backdrop-blur-md border border-border2 rounded-full shadow-2xl px-3 py-1.5 font-mono text-xs text-teal font-medium cursor-default float-right"
          onclick={() => { collapsed = false; }}
          transition:fly={{ y: 8, duration: 200 }}
        >
          ✓ {modelName}
        </button>
      {:else}
        <div
          class="bg-surface/90 backdrop-blur-md border border-border2 rounded-xl shadow-2xl p-4 font-mono text-xs"
          transition:fly={{ y: 8, duration: 200 }}
        >
          <div class="flex items-center justify-between">
            <span class="text-teal font-medium">
              {#if fromCache}
                ⚡ {modelName} (from cache) · {elapsed}s
              {:else}
                ✓ {modelName} ready
                {#if totalMB && totalMB > 0} · {fmt(totalMB)}{/if}
                {#if elapsed > 0} · {elapsed}s{/if}
              {/if}
            </span>
            {#if onunload}
              <button
                class="text-text2 hover:text-accent2 transition-colors ml-2"
                onclick={onunload}
              >Unload</button>
            {/if}
          </div>
        </div>
      {/if}

    {:else if status === 'error'}
      <div class="bg-surface/90 backdrop-blur-md border border-accent2 rounded-xl shadow-2xl p-4 font-mono text-xs">
        <div class="flex items-center justify-between">
          <span class="text-accent2 font-medium">✕ {modelName} — failed</span>
        </div>
        {#if error}
          <p class="text-accent2/80 mt-1.5 break-words">{error}</p>
        {/if}
      </div>
    {/if}
  </div>
{/if}
