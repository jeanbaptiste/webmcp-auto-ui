<script lang="ts">
  interface Props {
    status: 'idle' | 'loading' | 'ready' | 'error';
    progress: number;
    elapsed: number;
    loadedMB?: number;
    totalMB?: number;
    modelName?: string;
    onunload?: () => void;
  }
  let { status, progress, elapsed, loadedMB = 0, totalMB = 0, modelName = 'Gemma E2B', onunload }: Props = $props();

  const fmt = (mb: number) => mb >= 1000 ? `${(mb / 1000).toFixed(1)}GB` : `${mb.toFixed(1)}MB`;
</script>

{#if status === 'loading'}
  <div class="flex flex-col gap-1.5 px-4 py-2.5 border-b border-border bg-accent/10 flex-shrink-0">
    <div class="flex items-center justify-between">
      <span class="text-xs font-mono text-accent font-medium">
        Loading {modelName}…
        {#if totalMB > 0}
          ({fmt(loadedMB)} / {fmt(totalMB)})
        {:else}
          {Math.round(progress)}%
        {/if}
      </span>
      <span class="text-[10px] font-mono text-text2">{elapsed}s</span>
    </div>
    <div class="w-full h-2 rounded-full bg-border2 overflow-hidden">
      <div class="h-full rounded-full bg-accent transition-all duration-300" style="width: {Math.max(progress, 2)}%"></div>
    </div>
  </div>
{:else if status === 'ready'}
  <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-teal/10 flex-shrink-0">
    <span class="text-xs font-mono text-teal font-medium">{modelName} ✓ ready</span>
    {#if onunload}
      <button class="text-[10px] font-mono text-text2 hover:text-accent2 transition-colors" onclick={onunload}>
        unload ✕
      </button>
    {/if}
  </div>
{:else if status === 'error'}
  <div class="flex items-center px-4 py-2 border-b border-border bg-accent2/10 flex-shrink-0">
    <span class="text-xs font-mono text-accent2">{modelName} — load failed</span>
  </div>
{/if}
