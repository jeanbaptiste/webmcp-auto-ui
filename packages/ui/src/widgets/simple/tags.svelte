<svelte:options customElement={{ tag: 'auto-tags', shadow: 'none' }} />

<script lang="ts">
  export interface TagItem {
    text: string;
    active?: boolean;
  }

  export interface TagsData {
    label?: string;
    tags?: TagItem[];
  }

  interface Props {
    data?: TagsData | null;
  }

  let { data = {} }: Props = $props();

  const label = $derived(data?.label);
  const tags = $derived(data?.tags ?? []);
</script>

<div class="p-3 md:p-4 flex gap-2 flex-wrap items-center">
  {#if label}
    <span class="text-[10px] font-mono text-text2">{label}</span>
  {/if}
  {#each tags as tag}
    <span
      class="text-[11px] font-mono px-3 py-1 rounded-full border transition-colors
        {tag.active ? 'border-teal text-teal bg-teal/10' : 'border-border2 text-text2'}"
    >{tag.text}</span>
  {/each}
</div>
