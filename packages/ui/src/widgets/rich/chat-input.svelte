<svelte:options customElement={{ tag: 'auto-chat-input', shadow: 'none' }} />

<script lang="ts">
  import ChatInline from '../../base/chat-inline.svelte';

  export interface ChatInputData {
    placeholder?: string;
  }

  interface Props {
    data?: ChatInputData | null;
    placeholder?: string;
    disabled?: boolean;
    value?: string;
  }

  let { data = null, placeholder = '', disabled = $bindable(false), value = $bindable('') }: Props = $props();

  const resolvedPlaceholder = $derived(data?.placeholder ?? placeholder ?? 'Type a message...');

  let rootEl = $state<HTMLElement | null>(null);

  function handleSubmit(e: CustomEvent<string>) {
    const text = e.detail;
    if (!text) return;
    rootEl?.dispatchEvent(
      new CustomEvent('widget:interact', {
        detail: { action: 'submit', payload: { text } },
        bubbles: true,
      })
    );
  }

  function handleStop() {
    rootEl?.dispatchEvent(
      new CustomEvent('widget:interact', {
        detail: { action: 'stop', payload: null },
        bubbles: true,
      })
    );
  }
</script>

<div bind:this={rootEl} class="w-full">
  <ChatInline
    placeholder={resolvedPlaceholder}
    {disabled}
    bind:value
    onsubmit={handleSubmit}
    onstop={handleStop}
  />
</div>
