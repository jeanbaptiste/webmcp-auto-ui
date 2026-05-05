<script lang="ts">
  interface Props {
    placeholder?: string;
    disabled?: boolean;
    value?: string;
    onsubmit?: (text: string) => void;
    onstop?: () => void;
  }

  let { placeholder = 'Type a message...', disabled = false, value = $bindable(''), onsubmit, onstop }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);

  function handleSubmit() {
    const text = value?.trim();
    if (!text || disabled) return;
    onsubmit?.(text);
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
    onstop?.();
    inputEl?.dispatchEvent(new CustomEvent('stop', { bubbles: true }));
  }
</script>

<div class="chat-inline">
  <input
    bind:this={inputEl}
    bind:value
    type="text"
    {placeholder}
    {disabled}
    onkeydown={handleKeydown}
    class="chat-inline__input"
  />
  {#if disabled}
    <button
      type="button"
      onclick={handleStop}
      class="chat-inline__btn chat-inline__btn--stop"
    >
      stop
    </button>
  {:else}
    <button
      type="button"
      onclick={handleSubmit}
      disabled={!value?.trim()}
      class="chat-inline__btn chat-inline__btn--send"
    >
      send
    </button>
  {/if}
</div>

<style>
  .chat-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  .chat-inline__input {
    flex: 1 1 0%;
    min-width: 0;
    height: 2.25rem;
    padding: 0 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border2, var(--color-border, #2a2a2a));
    background: var(--color-surface2, var(--color-surface, #1a1a1a));
    color: var(--color-text1, #f5f5f5);
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-family: inherit;
    outline: none;
    transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
  }

  .chat-inline__input::placeholder {
    color: var(--color-text2, #888);
    opacity: 0.4;
  }

  .chat-inline__input:focus {
    border-color: color-mix(in srgb, var(--color-accent, #4a9eff) 50%, transparent);
  }

  .chat-inline__input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-inline__btn {
    flex-shrink: 0;
    height: 2.25rem;
    padding: 0 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
    font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
    font-size: 0.6875rem;
    line-height: 1;
    cursor: pointer;
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease;
  }

  .chat-inline__btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chat-inline__btn--send {
    background: color-mix(in srgb, var(--color-accent, #4a9eff) 10%, transparent);
    color: var(--color-accent, #4a9eff);
    border-color: color-mix(in srgb, var(--color-accent, #4a9eff) 40%, transparent);
  }

  .chat-inline__btn--send:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent, #4a9eff) 20%, transparent);
  }

  .chat-inline__btn--stop {
    background: color-mix(in srgb, var(--color-accent2, #ff6b6b) 10%, transparent);
    color: var(--color-accent2, #ff6b6b);
    border-color: color-mix(in srgb, var(--color-accent2, #ff6b6b) 40%, transparent);
  }

  .chat-inline__btn--stop:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent2, #ff6b6b) 20%, transparent);
  }
</style>
