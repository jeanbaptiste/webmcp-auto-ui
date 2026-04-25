<script lang="ts">
  import type { McpMultiClient } from '@webmcp-auto-ui/core';
  import type { RunResult } from '@webmcp-auto-ui/sdk';
  import { runCode, estimateTokens } from '@webmcp-auto-ui/sdk';
  import { highlightCode } from '../primitives/markdown-renderer.js';
  import type { RecipeBlockAction } from './types.js';

  interface Props {
    code: string;
    lang?: string;
    /**
     * Custom action buttons in the gutter. If omitted AND `onrun` is provided,
     * a default Run button is rendered (back-compat with original flex behavior).
     */
    actions?: RecipeBlockAction[];
    /**
     * Back-compat: legacy flex usage. When set, a default Run button is rendered
     * that calls runCode(code, lang) and forwards the result to this callback.
     * Ignored when `actions` is provided.
     */
    onrun?: (payload: { code: string; lang: string; result: RunResult }) => void;
  }

  let {
    code = '',
    lang = 'text',
    actions = undefined,
    onrun,
  }: Props = $props();

  let editable = $state('');
  let runStatus = $state<'idle' | 'running' | 'done' | 'error'>('idle');
  let elapsed = $state(0);
  let liveTokens = $state(0);
  let lastDuration = $state<number | undefined>(undefined);
  let lastTokens = $state<number | undefined>(undefined);
  let timerId: ReturnType<typeof setInterval> | undefined;
  let doneResetId: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    editable = code;
  });

  let highlightedHtml = $derived(highlightCode(editable, lang || 'plaintext'));
  let preEl: HTMLPreElement | undefined = $state(undefined);
  let taEl: HTMLTextAreaElement | undefined = $state(undefined);

  function syncScroll() {
    if (preEl && taEl) {
      preEl.scrollTop = taEl.scrollTop;
      preEl.scrollLeft = taEl.scrollLeft;
    }
  }

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
    if (runStatus === 'running') return;
    if (doneResetId) {
      clearTimeout(doneResetId);
      doneResetId = undefined;
    }
    runStatus = 'running';
    elapsed = 0;
    liveTokens = estimateTokens(editable);
    const t0 = performance.now();
    startTimer(t0);

    const multi = (globalThis as unknown as { __multiMcp?: { multiClient: McpMultiClient } }).__multiMcp?.multiClient;
    const result = await runCode(editable, lang, multi);

    stopTimer();
    lastDuration = result.durationMs;
    lastTokens = result.tokens;
    runStatus = result.status === 'error' ? 'error' : 'done';

    onrun?.({ code: editable, lang, result });

    if (runStatus === 'done') {
      doneResetId = setTimeout(() => {
        if (runStatus === 'done') runStatus = 'idle';
      }, 1000);
    }
  }

  // Resolve the action list: explicit actions OR back-compat single Run button.
  const resolvedActions = $derived<RecipeBlockAction[]>(
    actions && actions.length > 0
      ? actions
      : onrun
        ? [{
            icon: '▶',
            label: 'Run',
            onclick: () => handleRun(),
          }]
        : []
  );

  // For the single-action Run case, we render run-status icon + stats inline.
  const isSingleRunAction = $derived(
    !actions && !!onrun && resolvedActions.length === 1
  );

  function handleActionClick(a: RecipeBlockAction) {
    a.onclick(editable, lang);
  }
</script>

<div class="code-block">
  <div class="gutter">
    {#if isSingleRunAction}
      <button
        type="button"
        class="run-btn {runStatus}"
        onclick={() => handleRun()}
        disabled={runStatus === 'running'}
        title={runStatus === 'running' ? 'Running...' : 'Run'}
      >
        <span class="icon">
          {#if runStatus === 'running'}
            {@html '&#x25D0;'}
          {:else if runStatus === 'done'}
            {@html '&#x2713;'}
          {:else if runStatus === 'error'}
            !
          {:else}
            {@html '&#x25B6;'}
          {/if}
        </span>
        {#if runStatus === 'running' || lastDuration !== undefined}
          <span class="stats">
            <span class="t">
              {runStatus === 'running' ? `${elapsed}ms` : `${lastDuration}ms`}
            </span>
            <span class="tok">
              {formatTokens(runStatus === 'running' ? liveTokens : (lastTokens ?? 0))}
            </span>
          </span>
        {/if}
      </button>
    {:else}
      {#each resolvedActions as a}
        <button
          type="button"
          class="action-btn {a.variant ?? 'default'}"
          onclick={() => handleActionClick(a)}
          title={a.label ?? a.icon}
        >
          <span class="icon">{@html a.icon}</span>
        </button>
      {/each}
    {/if}
  </div>

  <div class="editor-wrap">
    {#if lang && lang !== 'text'}
      <div class="lang-tag font-mono">{lang}</div>
    {/if}
    <pre bind:this={preEl} class="editor highlight-layer hljs font-mono" aria-hidden="true"><code class="hljs language-{lang || 'plaintext'}">{@html highlightedHtml}</code></pre>
    <textarea
      bind:this={taEl}
      bind:value={editable}
      onscroll={syncScroll}
      spellcheck="false"
      autocomplete="off"
      rows={Math.min(Math.max(editable.split('\n').length, 3), 20)}
      class="editor input-layer font-mono"
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
  .gutter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: stretch;
  }
  .run-btn,
  .action-btn {
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
  .run-btn:hover:not(:disabled),
  .action-btn:hover:not(:disabled) {
    background: #161b22;
    color: #fff;
  }
  .run-btn:disabled,
  .action-btn:disabled {
    cursor: progress;
  }
  .run-btn .icon,
  .action-btn .icon {
    font-size: 14px;
    line-height: 1;
  }
  .run-btn.running .icon {
    animation: spin 0.9s linear infinite;
  }
  .run-btn.done,
  .action-btn.success {
    color: rgb(74, 222, 128);
    border-color: rgba(74, 222, 128, 0.4);
  }
  .run-btn.error,
  .action-btn.error {
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
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre;
    tab-size: 2;
    margin: 0;
  }
  .highlight-layer {
    position: absolute;
    inset: 0;
    overflow: auto;
    pointer-events: none;
    border-color: transparent;
  }
  .highlight-layer :global(code.hljs) {
    background: transparent;
    padding: 0;
  }
  .input-layer {
    position: relative;
    color: transparent;
    caret-color: rgb(220, 220, 220);
    background: transparent;
    resize: vertical;
    outline: none;
    overflow: auto;
  }
  .input-layer::selection {
    color: transparent;
    background: rgba(96, 165, 250, 0.35);
  }
  .input-layer:focus {
    border-color: rgba(96, 165, 250, 0.45);
  }
  .editor-wrap {
    min-height: 0;
  }
</style>
