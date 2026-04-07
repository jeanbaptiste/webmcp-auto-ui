<script lang="ts">
  import { fly } from 'svelte/transition';

  interface EphemeralMsg { id: string; role: 'user' | 'assistant'; html: string; }
  interface Props { ephemeral: EphemeralMsg[]; }
  let { ephemeral }: Props = $props();
</script>

<div class="flex flex-col gap-2 items-start w-full">
  {#each ephemeral as msg (msg.id)}
    <div
      in:fly={{ y: 16, duration: 280, opacity: 0 }}
      out:fly={{ y: -32, duration: 450, opacity: 0 }}
      class="ephemeral-msg {msg.role}"
    >
      {@html msg.html}
    </div>
  {/each}
</div>

<style>
  .ephemeral-msg {
    max-width: 80%;
    padding: 8px 14px;
    border-radius: 14px;
    font-size: 0.7rem;
    font-family: 'IBM Plex Mono', monospace;
    backdrop-filter: blur(16px);
    line-height: 1.5;
    word-break: break-word;
  }
  .ephemeral-msg.user {
    background: rgba(124, 109, 250, 0.18);
    border: 1px solid rgba(124, 109, 250, 0.35);
    color: var(--color-text1);
    align-self: flex-end;
  }
  .ephemeral-msg.assistant {
    background: rgba(62, 207, 178, 0.12);
    border: 1px solid rgba(62, 207, 178, 0.25);
    color: var(--color-text1);
    align-self: flex-start;
  }
</style>
