<svelte:options customElement={{ tag: 'auto-json-viewer', shadow: 'none' }} />

<script lang="ts">
  export interface JsonViewerData {
    title?: string;
    data?: unknown;
    maxDepth?: number;
    expanded?: boolean;
    theme?: 'dark' | 'light';
  }

  interface Props {
    data?: JsonViewerData | null;
  }

  let { data = {} }: Props = $props();

  const value = $derived(data?.data !== undefined ? data.data : undefined);
  const maxDepth = $derived(data?.maxDepth ?? 5);
  const expanded = $derived(data?.expanded !== false);
</script>

{#snippet node(val: unknown, depth: number, seen: WeakSet<object>)}
  {#if val === null}
    <span style="color:var(--color-text2)">null</span>
  {:else if typeof val === 'boolean'}
    <span style="color:#a855f7">{String(val)}</span>
  {:else if typeof val === 'number'}
    <span style="color:var(--color-amber)">{val}</span>
  {:else if typeof val === 'string'}
    <span style="color:var(--color-teal)">"{val}"</span>
  {:else if Array.isArray(val)}
    {#if depth >= maxDepth}
      <span class="text-text2">[Array({val.length})]</span>
    {:else if seen.has(val)}
      <span class="text-text2 italic">[Circular]</span>
    {:else}
      {@const nextSeen = (seen.add(val), seen)}
      <details open={expanded && depth < 2}>
        <summary class="cursor-pointer text-text2 hover:text-text1 select-none">Array({val.length})</summary>
        <div class="ml-4 border-l border-border pl-3 mt-0.5">
          {#each val as item, i}
            <div class="py-0.5">
              <span class="text-text2 text-xs mr-1">{i}:</span>{@render node(item, depth + 1, nextSeen)}
            </div>
          {/each}
        </div>
      </details>
    {/if}
  {:else if typeof val === 'object'}
    {#if depth >= maxDepth}
      <span class="text-text2">{`{Object(${Object.keys(val as object).length})}`}</span>
    {:else if seen.has(val as object)}
      <span class="text-text2 italic">[Circular]</span>
    {:else}
      {@const nextSeen = ((seen as WeakSet<object>).add(val as object), seen)}
      <details open={expanded && depth < 2}>
        <summary class="cursor-pointer text-text2 hover:text-text1 select-none">{`{${Object.keys(val as object).length}}`}</summary>
        <div class="ml-4 border-l border-border pl-3 mt-0.5">
          {#each Object.entries(val as Record<string, unknown>) as [k, v]}
            <div class="py-0.5">
              <span class="text-accent mr-1">"{k}":</span>{@render node(v, depth + 1, nextSeen)}
            </div>
          {/each}
        </div>
      </details>
    {/if}
  {:else}
    <span class="text-text2">{String(val)}</span>
  {/if}
{/snippet}

<div class="bg-bg border border-border rounded-lg p-3 md:p-4 font-mono text-xs leading-5 text-text1">
  {#if data?.title}
    <div class="font-sans text-sm font-semibold text-text1 mb-3">{data.title}</div>
  {/if}
  {#if value === undefined}
    <span class="text-text2">undefined</span>
  {:else}
    {@render node(value, 0, new WeakSet())}
  {/if}
</div>
