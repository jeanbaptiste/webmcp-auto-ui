<script lang="ts">
  interface Props {
    placeholder?: string;
    disabled?: boolean;
    value?: string;
  }

  let { placeholder = 'Type a message...', disabled = false, value = $bindable('') }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);

  function handleSubmit() {
    const text = value?.trim();
    if (!text || disabled) return;
    inputEl?.dispatchEvent(new CustomEvent('submit', { detail: text, bubbles: true }));
    value = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleStop() {
    inputEl?.dispatchEvent(new CustomEvent('stop', { bubbles: true }));
  }
</script>

<div class="flex items-center gap-2 w-full">
  <input
    bind:this={inputEl}
    bind:value
    type="text"
    {placeholder}
    {disabled}
    onkeydown={handleKeydown}
    class="flex-1 h-9 px-3 rounded-lg border border-border2 bg-surface2 text-sm text-text1
           placeholder:text-text2/40 focus:outline-none focus:border-accent/50
           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  />
  {#if disabled}
    <button
      type="button"
      onclick={handleStop}
      class="h-9 px-3 rounded-lg border border-accent2/40 bg-accent2/10 text-accent2
             text-xs font-mono hover:bg-accent2/20 transition-colors flex-shrink-0"
    >
      stop
    </button>
  {:else}
    <button
      type="button"
      onclick={handleSubmit}
      disabled={!value?.trim()}
      class="h-9 px-3 rounded-lg border border-accent/40 bg-accent/10 text-accent
             text-xs font-mono hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed
             transition-colors flex-shrink-0"
    >
      send
    </button>
  {/if}
</div>
