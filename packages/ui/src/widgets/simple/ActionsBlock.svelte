<script lang="ts">
  export interface ActionButton { label: string; primary?: boolean; onclick?: () => void; }
  export interface ActionsBlockData { buttons: ActionButton[]; }
  interface Props { data: Partial<ActionsBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-3 md:p-4 flex gap-2 flex-wrap">
  {#each (data.buttons ?? []) as btn}
    <button
      class="text-xs font-mono px-4 py-2 rounded border transition-all
        {btn.primary ? 'bg-accent border-accent text-white hover:opacity-85' : 'border-border2 text-text2 hover:border-accent hover:text-accent'}"
      onclick={btn.onclick}
    >{btn.label}</button>
  {/each}
</div>
