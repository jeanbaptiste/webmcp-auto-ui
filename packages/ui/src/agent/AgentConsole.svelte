<script lang="ts">
  interface Props {
    logs: { ts: number; type: string; detail: string }[];
    onclear?: () => void;
    class?: string;
  }

  let { logs, onclear, class: cls = '' }: Props = $props();

  let logsEnd: HTMLDivElement | undefined = $state(undefined);
  let modalContent = $state<string | null>(null);

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
    prompt: '#6366f1',
  };

  function fmtTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /** Extract provenance tag from tool log detail */
  function parseProvenance(detail: string): { tag: 'recette' | 'impro' | null; rest: string } {
    if (detail.startsWith('[recette] ')) return { tag: 'recette', rest: detail.slice(10) };
    if (detail.startsWith('[impro] ')) return { tag: 'impro', rest: detail.slice(8) };
    return { tag: null, rest: detail };
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
        <div class="ac-entry" class:ac-clickable={log.detail.length > 80}
             onclick={() => { if (log.detail.length > 80) modalContent = log.detail; }}
             role={log.detail.length > 80 ? 'button' : undefined}
             tabindex={log.detail.length > 80 ? 0 : undefined}>
          <span class="ac-ts">{fmtTime(log.ts)}</span>
          <span class="ac-type" style="color:{typeColor[log.type] ?? 'var(--color-text2, #888)'}">{log.type}</span>
          {#if log.type === 'tool'}
            {@const prov = parseProvenance(log.detail)}
            {#if prov.tag}
              <span class="ac-tag" class:ac-tag-recette={prov.tag === 'recette'} class:ac-tag-impro={prov.tag === 'impro'}>{prov.tag}</span>
            {/if}
            <span class="ac-detail">{prov.rest}</span>
          {:else}
            <span class="ac-detail">{log.detail}</span>
          {/if}
        </div>
      {/each}
      <div bind:this={logsEnd}></div>
    {/if}
  </div>
</div>

<!-- Detail modal -->
{#if modalContent}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ac-modal-overlay" onclick={() => modalContent = null}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="ac-modal" onclick={(e) => e.stopPropagation()}>
      <div class="ac-modal-header">
        <span class="ac-title">Détail</span>
        <button class="ac-clear" onclick={() => modalContent = null}>✕</button>
      </div>
      <pre class="ac-modal-content">{modalContent}</pre>
    </div>
  </div>
{/if}

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

  .ac-tag {
    flex-shrink: 0;
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0 3px;
    border-radius: 2px;
    line-height: 1.6;
  }
  .ac-tag-recette {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
  }
  .ac-tag-impro {
    color: #fb923c;
    background: rgba(251, 146, 60, 0.1);
  }

  .ac-clickable {
    cursor: pointer;
  }
  .ac-clickable:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .ac-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .ac-modal {
    background: var(--color-surface, #1a1a1e);
    border: 1px solid var(--color-border2, #333);
    border-radius: 8px;
    max-width: 720px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  }

  .ac-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border, #222);
    flex-shrink: 0;
  }

  .ac-modal-content {
    padding: 12px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 10px;
    line-height: 1.6;
    color: var(--color-text1, #ddd);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }
</style>
