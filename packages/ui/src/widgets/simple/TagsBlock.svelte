<script lang="ts">
  export interface TagItem { text: string; active?: boolean; }
  export interface TagsBlockData { label?: string; tags: TagItem[]; }
  interface Props { data: Partial<TagsBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-4 flex gap-2 flex-wrap items-center">
  {#if data.label}<span class="text-[10px] font-mono text-zinc-600">{data.label}</span>{/if}
  {#each (data.tags ?? []) as tag}
    <span class="text-[11px] font-mono px-3 py-1 rounded-full border transition-colors
      {tag.active ? 'border-[#3ecfb2] text-[#3ecfb2] bg-[#3ecfb2]/10' : 'border-white/[0.13] text-zinc-500'}">
      {tag.text}
    </span>
  {/each}
</div>
