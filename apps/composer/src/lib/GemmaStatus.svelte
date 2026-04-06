<script lang="ts">
  import { X } from 'lucide-svelte';

  interface Props {
    status: 'idle' | 'loading' | 'ready' | 'error';
    progress: number;
    elapsed: number;
    loadedMB?: number;
    totalMB?: number;
    onunload: () => void;
  }
  let { status, progress, elapsed, loadedMB = 0, totalMB = 0, onunload }: Props = $props();
  const fmt = (mb: number) => mb >= 1000 ? `${(mb / 1000).toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
</script>

{#if status === 'loading'}
  <span class="font-mono text-[10px] text-accent flex-shrink-0 flex items-center gap-1.5">
    <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
    Loading…
    {#if totalMB > 0}
      ({fmt(loadedMB)}/{fmt(totalMB)})
    {:else}
      {progress}%
    {/if}
    · {elapsed}s
  </span>
{:else if status === 'ready'}
  <span class="font-mono text-[10px] text-teal flex-shrink-0 flex items-center gap-1">
    Gemma E2B ✓
    <button class="text-text2 hover:text-accent2 ml-1" onclick={onunload}><X size={10} /></button>
  </span>
{/if}
