<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { RunTab } from './recipes/types.js';
  import { safeStringify } from './recipes/runner.js';

  interface Props {
    open: boolean;
    runs: RunTab[];
    activeTabId: string | null;
    onclose: () => void;
    onreplay: (tabId: string) => void;
    onselectTab: (tabId: string) => void;
    /** When true, render as an inline panel inside the host modal instead of a floating side panel. */
    inline?: boolean;
  }

  let {
    open,
    runs,
    activeTabId,
    onclose,
    onreplay,
    onselectTab,
    inline = false,
  }: Props = $props();

  const active = $derived(runs.find((r) => r.id === activeTabId) ?? runs[runs.length - 1] ?? null);

  let logsOpen = $state(true);
  let copyState = $state<'idle' | 'copied'>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  function formatTokens(n: number | undefined): string {
    if (n == null) return '—';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return `${n}`;
  }

  async function copyOutput() {
    if (!active) return;
    try {
      const text =
        active.result.status === 'error'
          ? (active.result.error ?? '')
          : safeStringify(active.result.output);
      await navigator.clipboard.writeText(text);
      copyState = 'copied';
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copyState = 'idle'; }, 1500);
    } catch {
      /* ignore */
    }
  }
</script>

{#if open}
  <div
    class="run-panel {inline ? 'inline' : 'side'} bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
    transition:fly={{ x: inline ? 0 : 24, y: inline ? 12 : 0, duration: 200 }}
  >
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
      <span class="font-mono text-xs font-bold text-text1 flex-1 truncate">
        {#if active}
          {@html '&#x25B6;'} Run · <span class="text-accent">{active.label}</span>
        {:else}
          Run
        {/if}
      </span>
      <button
        class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
        onclick={onclose}
        title="Close"
      >x</button>
    </div>

    <!-- Tabs (if multiple) -->
    {#if runs.length > 1}
      <div class="flex items-center gap-1 px-3 py-1.5 border-b border-border overflow-x-auto flex-shrink-0">
        {#each runs as tab (tab.id)}
          <button
            class="font-mono text-[10px] px-2 py-1 rounded border transition-colors whitespace-nowrap
                   {tab.id === active?.id
                     ? 'border-accent/50 text-accent bg-accent/10'
                     : 'border-border2 text-text2 hover:text-text1'}"
            onclick={() => onselectTab(tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </div>
    {/if}

    {#if active}
      <!-- Stats row -->
      <div class="flex items-center gap-4 px-4 py-2 border-b border-border flex-shrink-0 font-mono text-[11px]">
        <span class="text-text2">
          {@html '&#x23F1;'} <span class="text-text1">{active.result.durationMs ?? '—'}{active.result.durationMs != null ? 'ms' : ''}</span>
        </span>
        <span class="text-text2">
          {@html '&#x25FC;'} <span class="text-text1">{formatTokens(active.result.tokens)} tok</span>
        </span>
        <span class="ml-auto">
          {#if active.result.status === 'running'}
            <span class="text-accent">{@html '&#x25D0;'} running</span>
          {:else if active.result.status === 'done'}
            <span class="text-teal">{@html '&#x2713;'} done</span>
          {:else if active.result.status === 'error'}
            <span class="text-red-400">! error</span>
          {:else}
            <span class="text-text2">idle</span>
          {/if}
        </span>
        <button
          class="font-mono text-xs h-6 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
          onclick={() => onreplay(active.id)}
          disabled={active.result.status === 'running'}
          title="Replay"
        >{@html '&#x21BB;'}</button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <!-- Output -->
        <div>
          <div class="flex items-center mb-1">
            <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">
              {active.result.status === 'error' ? 'Error' : 'Output'}
            </span>
            <button
              class="ml-auto font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
                     {copyState === 'copied' ? 'border-teal/40 text-teal' : 'border-border2 text-text2 hover:text-text1'}"
              onclick={copyOutput}
            >
              {copyState === 'copied' ? 'copied' : 'copy'}
            </button>
          </div>
          <pre class="output-pre font-mono"><code>{
            active.result.status === 'running'
              ? '...'
              : active.result.status === 'error'
                ? (active.result.error ?? '(unknown error)')
                : safeStringify(active.result.output)
          }</code></pre>
        </div>

        <!-- Logs -->
        {#if active.result.logs.length > 0}
          <div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="flex items-center gap-1 cursor-pointer select-none"
              onclick={() => logsOpen = !logsOpen}
            >
              <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Logs ({active.result.logs.length})</span>
              <span class="text-[10px] text-text2 ml-1 transition-transform {logsOpen ? 'rotate-90' : ''}">{@html '&#x25B6;'}</span>
            </div>
            {#if logsOpen}
              <div class="mt-1 flex flex-col gap-0.5">
                {#each active.result.logs as entry, i (i)}
                  <div class="font-mono text-[10px] text-text2">
                    <span class="text-text2/60">[+{entry.t}ms]</span>
                    <span class="text-text1">{entry.msg}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex-1 flex items-center justify-center">
        <span class="font-mono text-xs text-text2">No run yet</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .run-panel.side {
    width: 100%;
    height: 100%;
  }
  .run-panel.inline {
    width: 100%;
    max-height: 50vh;
  }
  .output-pre {
    background: #0d1117;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.375rem;
    padding: 0.6rem 0.7rem;
    margin: 0;
    font-size: 0.7rem;
    line-height: 1.5;
    color: rgb(220, 220, 220);
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
