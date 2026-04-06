<script lang="ts">
  export interface ActionButton { label: string; primary?: boolean; onclick?: () => void; }
  export interface ActionsBlockData { buttons: ActionButton[]; }
  interface Props { data: Partial<ActionsBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-4 flex gap-2 flex-wrap">
  {#each (data.buttons ?? []) as btn}
    <button
      class="text-xs font-mono px-4 py-2 rounded border transition-all
        {btn.primary ? 'bg-[#7c6dfa] border-[#7c6dfa] text-white hover:opacity-85' : 'border-white/[0.13] text-zinc-400 hover:border-[#7c6dfa] hover:text-[#7c6dfa]'}"
      onclick={btn.onclick}
    >{btn.label}</button>
  {/each}
</div>
