<script lang="ts">
  import { fly } from 'svelte/transition';
  import { renderMarkdown } from '../primitives/markdown-renderer.js';

  interface EphemeralMsg { id: string; role: 'user' | 'assistant'; html: string; }
  interface Props { ephemeral: EphemeralMsg[]; }
  let { ephemeral }: Props = $props();

  // Detect if content has any markdown markers worth parsing.
  // If not, we skip marked entirely and fall back to {@html} for the
  // pre-existing HTML snippets (e.g. "<strong>tool_name</strong>").
  const MD_RE = /(^|\n)\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\*\*|__|`|```|~~~|!\[|\[[^\]]+\]\(/;
  function looksLikeMarkdown(src: string): boolean {
    return MD_RE.test(src);
  }

  // Gracefully close dangling code fences during streaming so that
  // a half-received ``` block still renders as code instead of
  // swallowing the rest of the message.
  function closeDanglingFences(src: string): string {
    const fences = (src.match(/```/g) ?? []).length;
    if (fences % 2 === 1) return src + '\n```';
    const tildes = (src.match(/~~~/g) ?? []).length;
    if (tildes % 2 === 1) return src + '\n~~~';
    return src;
  }

  function renderContent(src: string): string {
    if (!src) return '';
    if (!looksLikeMarkdown(src)) return src;
    try {
      return renderMarkdown(closeDanglingFences(src));
    } catch {
      return src;
    }
  }
</script>

<div class="flex flex-col gap-2 items-start w-full">
  {#each ephemeral as msg (msg.id)}
    <div
      in:fly={{ y: 16, duration: 280, opacity: 0 }}
      out:fly={{ y: -32, duration: 450, opacity: 0 }}
      class="ephemeral-msg {msg.role}"
    >
      {@html renderContent(msg.html)}
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
  /* Markdown tweaks scoped to the ephemeral bubble — keep margins tight. */
  .ephemeral-msg :global(p) { margin: 0.25rem 0; }
  .ephemeral-msg :global(p:first-child) { margin-top: 0; }
  .ephemeral-msg :global(p:last-child) { margin-bottom: 0; }
  .ephemeral-msg :global(h1),
  .ephemeral-msg :global(h2),
  .ephemeral-msg :global(h3),
  .ephemeral-msg :global(h4) {
    font-weight: 600;
    margin: 0.35rem 0 0.25rem;
    font-size: 0.78rem;
  }
  .ephemeral-msg :global(ul),
  .ephemeral-msg :global(ol) {
    margin: 0.3rem 0;
    padding-left: 1.1rem;
  }
  .ephemeral-msg :global(li) { margin: 0.1rem 0; }
  .ephemeral-msg :global(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.66rem;
    background: rgba(0, 0, 0, 0.28);
    padding: 0.05rem 0.25rem;
    border-radius: 0.2rem;
  }
  .ephemeral-msg :global(pre) {
    background: rgba(0, 0, 0, 0.35);
    border-radius: 0.3rem;
    padding: 0.5rem;
    margin: 0.35rem 0;
    overflow-x: auto;
    font-size: 0.66rem;
  }
  .ephemeral-msg :global(pre code) { background: transparent; padding: 0; }
  .ephemeral-msg :global(strong) { font-weight: 600; }
  .ephemeral-msg :global(em) { font-style: italic; }
  .ephemeral-msg :global(a) { color: rgb(96, 165, 250); text-decoration: underline; }
</style>
