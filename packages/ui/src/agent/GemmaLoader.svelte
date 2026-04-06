<script lang="ts">
  interface Props {
    status: 'idle' | 'loading' | 'ready' | 'error';
    progress: number;
    elapsed: number;
    modelName?: string;
    onunload?: () => void;
  }
  let { status, progress, elapsed, modelName = 'Gemma E2B', onunload }: Props = $props();
</script>

{#if status === 'loading'}
  <div class="flex flex-col gap-1 px-4 py-2 border-b border-border bg-surface flex-shrink-0">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-mono text-amber">{modelName} — chargement… {Math.round(progress)}%</span>
      <span class="text-[10px] font-mono text-text2">{elapsed}s</span>
    </div>
    <div class="w-full h-1 rounded-full bg-border2 overflow-hidden">
      <div class="h-full rounded-full bg-teal transition-all duration-300" style="width: {progress}%"></div>
    </div>
  </div>
{:else if status === 'ready'}
  <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-surface flex-shrink-0">
    <span class="text-[10px] font-mono text-teal">{modelName} ✓</span>
    {#if onunload}
      <button class="text-[10px] font-mono text-text2 hover:text-accent2 transition-colors" onclick={onunload}>
        décharger ✕
      </button>
    {/if}
  </div>
{/if}
