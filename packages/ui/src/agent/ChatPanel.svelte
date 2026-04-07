<script lang="ts">
  import { tick } from 'svelte';
  import BlockRenderer from '../widgets/BlockRenderer.svelte';
  import AgentProgress from './AgentProgress.svelte';

  export type ChatBubble = { kind: 'bubble'; role: 'user' | 'assistant'; html: string; id: string };
  export type ChatBlock  = { kind: 'block';  id: string; type: string; data: Record<string, unknown>; src?: string };
  export type ChatFeedItem = ChatBubble | ChatBlock;

  interface Props {
    feed?: ChatFeedItem[];
    input?: string;
    generating?: boolean;
    timer?: number;
    toolCount?: number;
    lastTool?: string;
    placeholder?: string;
    showSrc?: boolean;
    onsend?: (msg: string) => void;
    class?: string;
  }

  let {
    feed = [],
    input = $bindable(''),
    generating = false,
    timer = 0,
    toolCount = 0,
    lastTool = '',
    placeholder = 'Posez une question…',
    showSrc = false,
    onsend,
    class: cls = '',
  }: Props = $props();

  let feedEl: HTMLDivElement;

  $effect(() => {
    feed;
    tick().then(() => { if (feedEl) feedEl.scrollTop = feedEl.scrollHeight; });
  });

  function send() {
    const msg = input.trim();
    if (!msg || generating) return;
    input = '';
    onsend?.(msg);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

<div class="flex flex-col {cls}">
  <!-- Feed -->
  <div bind:this={feedEl} class="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
    {#each feed as item (item.id)}
      {#if item.kind === 'bubble'}
        <div class="flex {item.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[85%] rounded-xl px-3 py-2 text-sm {item.role === 'user'
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-surface2 text-text1 rounded-bl-sm border border-border2'}">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html item.html}
          </div>
        </div>
      {:else}
        <div class="rounded-lg border border-border2 overflow-hidden">
          {#if showSrc && item.src}
            <div class="text-[9px] font-mono text-text2 px-3 pt-2 uppercase tracking-wider">{item.src}</div>
          {/if}
          <BlockRenderer type={item.type} data={item.data} />
        </div>
      {/if}
    {/each}
  </div>

  <!-- Progress bar -->
  <AgentProgress active={generating} elapsed={timer} toolCalls={toolCount} lastTool={lastTool} />

  <!-- Input -->
  <div class="flex items-center gap-2 p-2 border-t border-border flex-shrink-0">
    <input
      type="text"
      bind:value={input}
      {onkeydown}
      {placeholder}
      disabled={generating}
      class="flex-1 min-w-0 bg-surface2 border border-border2 rounded-lg px-3 h-9 text-sm text-text1 outline-none placeholder:text-text2/40 focus:border-accent/50 disabled:opacity-50 transition-colors"
    />
    <button
      onclick={send}
      disabled={!input.trim() || generating}
      class="h-9 px-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
    >
      →
    </button>
  </div>
</div>
