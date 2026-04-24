<svelte:options customElement={{ tag: 'auto-list', shadow: 'none' }} />

<script lang="ts">
  export interface ListData {
    title?: string;
    items?: string[];
  }

  interface Props {
    data?: ListData | null;
    onitemclick?: (item: string, index: number) => void;
  }

  let { data = {}, onitemclick }: Props = $props();

  const title = $derived(data?.title);
  const items = $derived(data?.items ?? []);
</script>

<div class="p-3 md:p-4">
  {#if title}
    <div class="text-[10px] font-mono text-text2 mb-3 uppercase tracking-widest">{title}</div>
  {/if}
  <ul class="flex flex-col gap-1.5">
    {#each items as item, i}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li
        class="text-sm text-text1 bg-surface2 rounded px-3 py-2 border-l-2 border-accent {onitemclick ? 'cursor-pointer hover:bg-surface2/80' : ''}"
        title={onitemclick ? 'Double-cliquez pour interagir' : undefined}
        ondblclick={() => onitemclick?.(item, i)}
      >{item}</li>
    {/each}
  </ul>
</div>
