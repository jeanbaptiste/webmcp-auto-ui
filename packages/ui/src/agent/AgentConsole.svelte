<script lang="ts">
  interface Props {
    logs: { ts: number; type: string; detail: string }[];
    onclear?: () => void;
    class?: string;
  }

  let { logs, onclear, class: cls = '' }: Props = $props();

  let logsEnd: HTMLDivElement | undefined = $state(undefined);

  $effect(() => {
    if (logsEnd && logs.length > 0) {
      requestAnimationFrame(() => logsEnd?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    }
  });

  const typeColor: Record<string, string> = {
    iteration: '#8b5cf6',
    request: '#3b82f6',
    response: '#10b981',
    tool: '#f59e0b',
    text: 'var(--color-text2, #888)',
    done: '#14b8a6',
    error: '#ef4444',
  };

  function fmtTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
</script>

<div class="agent-console {cls}">
  <!-- Header -->
  <div class="ac-header">
    <span class="ac-title">Agent logs</span>
    <span class="ac-count">{logs.length}</span>
    <div class="ac-spacer"></div>
    {#if logs.length > 0 && onclear}
      <button class="ac-clear" onclick={onclear}>clear</button>
    {/if}
  </div>

  <!-- Logs -->
  <div class="ac-content">
    {#if logs.length === 0}
      <div class="ac-empty">en attente...</div>
    {:else}
      {#each logs as log}
        <div class="ac-entry">
          <span class="ac-ts">{fmtTime(log.ts)}</span>
          <span class="ac-type" style="color:{typeColor[log.type] ?? 'var(--color-text2, #888)'}">{log.type}</span>
          <span class="ac-detail">{log.detail}</span>
        </div>
      {/each}
      <div bind:this={logsEnd}></div>
    {/if}
  </div>
</div>

<style>
  .agent-console {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    font-family: monospace;
    font-size: 9px;
  }

  .ac-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .ac-title {
    font-family: monospace;
    font-size: 9px;
    color: var(--color-text2, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ac-count {
    font-family: monospace;
    font-size: 9px;
    color: var(--color-text2, #888);
    opacity: 0.5;
  }

  .ac-spacer {
    flex: 1;
  }

  .ac-clear {
    font-family: monospace;
    font-size: 9px;
    color: var(--color-text2, #888);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
  }
  .ac-clear:hover {
    color: var(--color-accent, #a78bfa);
  }

  .ac-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
    line-height: 1.5;
  }

  .ac-empty {
    font-style: italic;
    color: var(--color-text2, #888);
    opacity: 0.4;
    padding: 16px 0;
    text-align: center;
  }

  .ac-entry {
    display: flex;
    gap: 6px;
    padding: 1px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    word-break: break-all;
  }

  .ac-ts {
    flex-shrink: 0;
    color: var(--color-text2, #888);
    opacity: 0.5;
  }

  .ac-type {
    flex-shrink: 0;
    font-weight: 600;
    min-width: 52px;
    text-transform: uppercase;
    font-size: 8px;
  }

  .ac-detail {
    color: var(--color-text2, #aaa);
  }
</style>
