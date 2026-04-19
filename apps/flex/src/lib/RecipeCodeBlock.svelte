<script lang="ts">
  import type { McpMultiClient } from '@webmcp-auto-ui/core';
  import type { RunResult } from '@webmcp-auto-ui/sdk';
  import { runCode, estimateTokens } from '@webmcp-auto-ui/sdk';

  interface Props {
    code: string;
    lang?: string;
    multiClient?: McpMultiClient;
    /** Called when user clicks Run; receives the final RunResult + context. */
    onrun?: (payload: { code: string; lang: string; result: RunResult }) => void;
  }

  let {
    code = '',
    lang = 'text',
    multiClient,
    onrun,
  }: Props = $props();

  let editable = $state('');
  let status = $state<'idle' | 'running' | 'done' | 'error'>('idle');
  let elapsed = $state(0);
  let liveTokens = $state(0);
  let lastDuration = $state<number | undefined>(undefined);
  let lastTokens = $state<number | undefined>(undefined);
  let timerId: ReturnType<typeof setInterval> | undefined;
  let doneResetId: ReturnType<typeof setTimeout> | undefined;

  // Keep textarea in sync when the prop changes (different recipe opened).
  $effect(() => {
    editable = code;
  });

  function formatTokens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return `${n} tok`;
  }

  function startTimer(startAt: number) {
    stopTimer();
    timerId = setInterval(() => {
      elapsed = Math.round(performance.now() - startAt);
      liveTokens = estimateTokens(editable);
    }, 60);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
    }
  }

  async function handleRun() {
    if (status === 'running') return;
    if (doneResetId) {
      clearTimeout(doneResetId);
      doneResetId = undefined;
    }
    status = 'running';
    elapsed = 0;
    liveTokens = estimateTokens(editable);
    const t0 = performance.now();
    startTimer(t0);

    const result = await runCode(editable, lang, multiClient);

    stopTimer();
    lastDuration = result.durationMs;
    lastTokens = result.tokens;
    status = result.status === 'error' ? 'error' : 'done';

    onrun?.({ code: editable, lang, result });

    // Reset icon to idle after 1s on success (keep error state until next run)
    if (status === 'done') {
      doneResetId = setTimeout(() => {
        if (status === 'done') status = 'idle';
      }, 1000);
    }
  }
</script>

<div class="code-block">
  <button
    type="button"
    class="run-btn {status}"
    onclick={handleRun}
    disabled={status === 'running'}
    title={status === 'running' ? 'Running...' : 'Run'}
  >
    <span class="icon">
      {#if status === 'running'}
        {@html '&#x25D0;'}
      {:else if status === 'done'}
        {@html '&#x2713;'}
      {:else if status === 'error'}
        !
      {:else}
        {@html '&#x25B6;'}
      {/if}
    </span>
    {#if status === 'running' || lastDuration !== undefined}
      <span class="stats">
        <span class="t">
          {status === 'running' ? `${elapsed}ms` : `${lastDuration}ms`}
        </span>
        <span class="tok">
          {formatTokens(status === 'running' ? liveTokens : (lastTokens ?? 0))}
        </span>
      </span>
    {/if}
  </button>

  <div class="editor-wrap">
    {#if lang && lang !== 'text'}
      <div class="lang-tag font-mono">{lang}</div>
    {/if}
    <textarea
      bind:value={editable}
      spellcheck="false"
      autocomplete="off"
      rows={Math.min(Math.max(editable.split('\n').length, 3), 20)}
      class="editor font-mono"
    ></textarea>
  </div>
</div>

<style>
  .code-block {
    display: flex;
    align-items: stretch;
    gap: 6px;
    margin: 0.5rem 0;
  }
  .run-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 56px;
    padding: 8px 6px;
    border-radius: 0.375rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: #0d1117;
    color: rgb(180, 180, 180);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  }
  .run-btn:hover:not(:disabled) {
    background: #161b22;
    color: #fff;
  }
  .run-btn:disabled {
    cursor: progress;
  }
  .run-btn .icon {
    font-size: 14px;
    line-height: 1;
  }
  .run-btn.running .icon {
    animation: spin 0.9s linear infinite;
  }
  .run-btn.done {
    color: rgb(74, 222, 128);
    border-color: rgba(74, 222, 128, 0.4);
  }
  .run-btn.error {
    color: rgb(248, 113, 113);
    border-color: rgba(248, 113, 113, 0.4);
  }
  .run-btn .stats {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 9px;
    color: rgb(160, 160, 160);
    line-height: 1.2;
  }
  .run-btn .stats .t { font-weight: 600; }
  .run-btn .stats .tok { opacity: 0.8; }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .editor-wrap {
    flex: 1;
    min-width: 0;
    position: relative;
  }
  .lang-tag {
    position: absolute;
    top: 4px;
    right: 8px;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.35);
    text-transform: lowercase;
    pointer-events: none;
  }
  .editor {
    display: block;
    width: 100%;
    box-sizing: border-box;
    background: #0d1117;
    color: rgb(220, 220, 220);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.375rem;
    padding: 0.7rem;
    font-size: 0.7rem;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    overflow-x: auto;
    white-space: pre;
  }
  .editor:focus {
    border-color: rgba(96, 165, 250, 0.45);
  }
</style>
