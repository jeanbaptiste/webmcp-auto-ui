<svelte:options customElement={{ tag: 'auto-actions', shadow: 'none' }} />

<script lang="ts">
  export interface ActionButton {
    label: string;
    primary?: boolean;
    /** aria-label override for icon-only buttons */
    ariaLabel?: string;
    onclick?: () => void;
  }

  export interface ActionsData {
    buttons?: ActionButton[];
  }

  interface Props {
    data?: ActionsData | null;
  }

  let { data = {} }: Props = $props();

  const buttons = $derived(data?.buttons ?? []);
</script>

<div class="p-3 md:p-4 flex gap-2 flex-wrap">
  {#each buttons as btn}
    <button
      class="text-xs font-mono px-4 py-2 rounded border transition-all
        {btn.primary
          ? 'bg-accent border-accent text-white hover:opacity-85'
          : 'border-border2 text-text2 hover:border-accent hover:text-accent'}"
      aria-label={btn.ariaLabel ?? btn.label}
      onclick={btn.onclick}
    >{btn.label}</button>
  {/each}
</div>
