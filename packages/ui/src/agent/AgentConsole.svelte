<script lang="ts">
  interface Props {
    logs?: string[];
    open?: boolean;
    maxLines?: number;
    class?: string;
  }

  let {
    logs = [],
    open = $bindable(false),
    maxLines = 200,
    class: cls = '',
  }: Props = $props();

  const visible = $derived(logs.slice(-maxLines));
</script>

<div class="flex flex-col border-t border-border flex-shrink-0 {cls}">
  <button
    onclick={() => { open = !open; }}
    class="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono text-text2 hover:text-text1 transition-colors select-none"
  >
    <span class="text-[8px]">{open ? '▼' : '▶'}</span>
    <span>console</span>
    {#if logs.length > 0}
      <span class="text-accent/60">{logs.length}</span>
    {/if}
  </button>

  {#if open}
    <div class="bg-zinc-950 border-t border-border overflow-y-auto max-h-48 p-2 flex flex-col gap-0.5">
      {#if visible.length === 0}
        <span class="text-[10px] font-mono text-zinc-600 italic">no logs yet</span>
      {/if}
      {#each visible as line}
        <div class="text-[10px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap break-all">{line}</div>
      {/each}
    </div>
  {/if}
</div>
