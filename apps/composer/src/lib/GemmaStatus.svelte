<script lang="ts">
  import { X } from 'lucide-svelte';

  interface Props {
    status: 'idle' | 'loading' | 'ready' | 'error';
    progress: number;
    elapsed: number;
    onunload: () => void;
  }
  let { status, progress, elapsed, onunload }: Props = $props();
</script>

{#if status === 'loading'}
  <span class="font-mono text-[10px] text-amber-400 flex-shrink-0 flex items-center gap-1">
    <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
    {progress}% · {elapsed}s
  </span>
{:else if status === 'ready'}
  <span class="font-mono text-[10px] text-teal flex-shrink-0 flex items-center gap-1">
    ✓ Gemma ready
    <button class="text-zinc-500 hover:text-red-400 ml-1" onclick={onunload}><X size={10} /></button>
  </span>
{/if}
