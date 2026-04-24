<svelte:options customElement={{ tag: 'auto-kv', shadow: 'none' }} />

<script lang="ts">
  export interface KvData {
    title?: string;
    rows?: [string, string][];
  }

  interface Props {
    data?: KvData | null;
  }

  let { data = {} }: Props = $props();

  const title = $derived(data?.title);
  const rows = $derived(data?.rows ?? []);
</script>

<div class="p-3 md:p-4">
  {#if title}
    <div class="text-[10px] font-mono text-text2 mb-3 uppercase tracking-widest">{title}</div>
  {/if}
  <div class="flex flex-col gap-1.5">
    {#each rows as [k, v]}
      <div class="flex justify-between items-center text-sm border-b border-border pb-1.5 last:border-none last:pb-0">
        <span class="font-mono text-xs text-text2">{k}</span>
        <span class="text-text1 font-medium">{v}</span>
      </div>
    {/each}
  </div>
</div>
