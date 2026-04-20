<script lang="ts">
  import { WidgetRenderer, AgentProgress } from '@webmcp-auto-ui/ui';

  interface Block {
    id: string;
    type: string;
    data: Record<string, unknown>;
  }

  interface Props {
    blocks: Block[];
    active: boolean;
    elapsed: number;
    toolCalls: number;
    lastTool: string;
    textOutput: string;
    error: string;
    placeholder: string;
    prefill: string;
    hasConversation: boolean;
    onsend: (msg: string) => void;
    onstop: () => void;
    onclear: () => void;
  }

  let { blocks, active, elapsed, toolCalls, lastTool, textOutput, error,
        placeholder, prefill, hasConversation, onsend, onstop, onclear }: Props = $props();

  let inputText = $state('');

  // Pre-fill input when a recipe is selected (prefill prop changes)
  $effect(() => {
    const val = prefill;
    inputText = val;
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function send() {
    const msg = inputText.trim();
    if (!msg || active) return;
    inputText = '';
    onsend(msg);
  }
</script>

<div class="flex flex-col h-full border-t border-border">
  <!-- Header -->
  <div class="flex items-center gap-2 px-3 py-1.5 bg-surface border-b border-border flex-shrink-0">
    <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Preview</span>
    <div class="flex-1"></div>
    {#if hasConversation}
      <button
        class="font-mono text-[9px] h-5 px-1.5 rounded border border-border2 text-text2 hover:text-text1 hover:border-accent/40 transition-colors"
        onclick={onclear}
        disabled={active}
      >Clear</button>
    {/if}
    {#if active}
      <button
        class="font-mono text-[9px] h-5 px-1.5 rounded border border-accent2/40 bg-accent2/10 text-accent2 hover:bg-accent2/20 transition-colors"
        onclick={onstop}
      >Stop</button>
    {/if}
    <AgentProgress {active} {elapsed} {toolCalls} {lastTool} />
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-3">
    {#if error}
      <div class="font-mono text-xs text-accent2 bg-accent2/10 border border-accent2/20 rounded px-3 py-2">
        {error}
      </div>
    {/if}

    {#if textOutput}
      <div class="font-mono text-xs text-text1 bg-surface2 rounded px-3 py-2 mb-3 border border-border2 whitespace-pre-wrap">
        {textOutput}
      </div>
    {/if}

    {#if blocks.length > 0}
      <div class="flex flex-col gap-2">
        {#each blocks as block (block.id)}
          <div class="block-anim">
            <WidgetRenderer type={block.type} data={block.data} />
          </div>
        {/each}
      </div>
    {:else if !active && !textOutput && !error}
      <div class="flex items-center justify-center h-full text-text2 font-mono text-xs">
        Click "Test" on a recipe or ask a question below
      </div>
    {/if}
  </div>

  <!-- Chat input -->
  <div class="flex items-end gap-2 px-3 py-2 bg-surface border-t border-border flex-shrink-0">
    <textarea
      class="flex-1 font-mono text-xs text-text1 bg-bg border border-border2 rounded px-3 py-2
             placeholder:text-text2/50 resize-none focus:outline-none focus:border-accent/50
             disabled:opacity-40 disabled:cursor-not-allowed"
      rows="1"
      {placeholder}
      disabled={active}
      bind:value={inputText}
      onkeydown={handleKeydown}
    ></textarea>
    <button
      class="flex-shrink-0 font-mono text-xs h-8 px-3 rounded border border-accent bg-accent/10 text-accent
             hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={active || !inputText.trim()}
      onclick={send}
    >Send</button>
  </div>
</div>

<style>
  @keyframes slidein {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .block-anim { animation: slidein .25s ease-out; }
  textarea {
    min-height: 2rem;
    max-height: 6rem;
    field-sizing: content;
  }
</style>
