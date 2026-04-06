<script lang="ts">
  export interface KVBlockData { title?: string; rows: [string, string][]; }
  interface Props { data: Partial<KVBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-3 md:p-4">
  {#if data.title}<div class="text-[10px] font-mono text-text2 mb-3 uppercase tracking-widest">{data.title}</div>{/if}
  <div class="flex flex-col gap-1.5">
    {#each (data.rows ?? []) as [k, v]}
      <div class="flex justify-between items-center text-sm border-b border-border pb-1.5 last:border-none last:pb-0">
        <span class="font-mono text-xs text-text2">{k}</span>
        <span class="text-text1 font-medium">{v}</span>
      </div>
    {/each}
  </div>
</div>
