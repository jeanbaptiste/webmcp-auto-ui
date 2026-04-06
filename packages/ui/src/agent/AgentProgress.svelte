<script lang="ts">
  interface Props {
    active: boolean;
    elapsed: number;
    toolCalls?: number;
    lastTool?: string;
    tokensEstimate?: number;
    class?: string;
  }
  let { active, elapsed, toolCalls = 0, lastTool = '', tokensEstimate = 0, class: cls = '' }: Props = $props();

  const tokPerSec = $derived(elapsed > 0 && tokensEstimate > 0 ? Math.round(tokensEstimate / elapsed) : 0);
</script>

{#if active}
  <div class="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border-t border-border flex-shrink-0 {cls}">
    <div class="flex gap-0.5">
      {#each [0,1,2] as i}
        <div class="w-1 h-1 rounded-full bg-accent animate-pulse" style="animation-delay: {i*0.15}s"></div>
      {/each}
    </div>
    <span class="text-[10px] font-mono text-accent font-medium">{elapsed}s</span>
    {#if toolCalls > 0}
      <span class="text-[10px] font-mono text-text2">{toolCalls} tool{toolCalls > 1 ? 's' : ''}</span>
    {/if}
    {#if lastTool}
      <span class="text-[10px] font-mono text-text2 truncate max-w-32">🔧 {lastTool}</span>
    {/if}
    {#if tokPerSec > 0}
      <span class="text-[10px] font-mono text-teal ml-auto">{tokPerSec} tok/s</span>
    {/if}
  </div>
{/if}
