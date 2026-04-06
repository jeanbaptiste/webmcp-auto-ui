<script lang="ts">
  export interface JsonViewerSpec { title?: string; data?: unknown; maxDepth?: number; expanded?: boolean; theme?: 'dark'|'light'; }
  interface Props { spec: Partial<JsonViewerSpec>; data?: unknown; }
  let { spec, data }: Props = $props();
  const value = $derived(spec.data!==undefined ? spec.data : data);
  const maxDepth = $derived(spec.maxDepth??5);
  const expanded = $derived(spec.expanded!==false);
</script>

{#snippet node(val: unknown, depth: number)}
  {#if val===null}<span style="color:#94a3b8">null</span>
  {:else if typeof val==='boolean'}<span style="color:#a855f7">{String(val)}</span>
  {:else if typeof val==='number'}<span style="color:#f0a050">{val}</span>
  {:else if typeof val==='string'}<span style="color:#3ecfb2">"{val}"</span>
  {:else if Array.isArray(val)}
    {#if depth>=maxDepth}<span class="text-zinc-500">[Array({val.length})]</span>
    {:else}
      <details open={expanded&&depth<2}>
        <summary class="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none">Array({val.length})</summary>
        <div class="ml-4 border-l border-white/[0.07] pl-3 mt-0.5">
          {#each val as item, i}<div class="py-0.5"><span class="text-zinc-600 text-xs mr-1">{i}:</span>{@render node(item, depth+1)}</div>{/each}
        </div>
      </details>
    {/if}
  {:else if typeof val==='object'}
    {#if depth>=maxDepth}<span class="text-zinc-500">{`{Object(${Object.keys(val as object).length})}`}</span>
    {:else}
      <details open={expanded&&depth<2}>
        <summary class="cursor-pointer text-zinc-500 hover:text-zinc-300 select-none">{`{${Object.keys(val as object).length}}`}</summary>
        <div class="ml-4 border-l border-white/[0.07] pl-3 mt-0.5">
          {#each Object.entries(val as Record<string,unknown>) as [k, v]}<div class="py-0.5"><span class="text-[#7c6dfa] mr-1">"{k}":</span>{@render node(v, depth+1)}</div>{/each}
        </div>
      </details>
    {/if}
  {:else}<span class="text-zinc-500">{String(val)}</span>
  {/if}
{/snippet}

<div class="bg-[#0a0a0f] border border-white/[0.07] rounded-lg p-4 font-mono text-xs leading-5 text-zinc-300">
  {#if spec.title}<div class="font-sans text-sm font-semibold text-zinc-300 mb-3">{spec.title}</div>{/if}
  {#if value===undefined}<span class="text-zinc-600">undefined</span>{:else}{@render node(value, 0)}{/if}
</div>
