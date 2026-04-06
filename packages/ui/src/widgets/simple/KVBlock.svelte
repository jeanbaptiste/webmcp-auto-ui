<script lang="ts">
  export interface KVBlockData { title?: string; rows: [string, string][]; }
  interface Props { data: Partial<KVBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-4">
  {#if data.title}<div class="text-[10px] font-mono text-zinc-600 mb-3 uppercase tracking-widest">{data.title}</div>{/if}
  <div class="flex flex-col gap-1.5">
    {#each (data.rows ?? []) as [k, v]}
      <div class="flex justify-between items-center text-sm border-b border-white/[0.05] pb-1.5 last:border-none last:pb-0">
        <span class="font-mono text-xs text-zinc-500">{k}</span>
        <span class="text-white font-medium">{v}</span>
      </div>
    {/each}
  </div>
</div>
