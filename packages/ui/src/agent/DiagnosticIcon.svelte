<script lang="ts">
  interface Props {
    count: number;
    onclick: () => void;
  }

  let { count, onclick }: Props = $props();
</script>

{#if count > 0}
  <button
    class="inline-flex items-center gap-0.5 text-amber-500 hover:text-amber-400 cursor-pointer transition-colors"
    {onclick}
    aria-label="Diagnostics: {count} probleme{count > 1 ? 's' : ''}"
    title="Diagnostics: {count} probleme{count > 1 ? 's' : ''}">
    <span class="text-xs leading-none">&#x26A0;</span>
    <span class="inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-amber-500/20 text-[9px] font-mono font-bold leading-none">
      {count}
    </span>
  </button>
{/if}
