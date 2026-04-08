<script lang="ts">
  import { fly } from 'svelte/transition';

  interface Props {
    metrics: {
      requestsPerMin: number;
      inputTokensPerMin: number;
      outputTokensPerMin: number;
      lastInputTokens: number;
      lastOutputTokens: number;
      lastCacheReadTokens: number;
      totalRequests: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalCacheReadTokens: number;
      totalCachedGB: number;
      isWasm: boolean;
    };
    visible?: boolean;
  }

  let { metrics, visible = true }: Props = $props();

  // Rate limits (Anthropic tier)
  const LIMITS = { reqPerMin: 1000, inPerMin: 450_000, outPerMin: 90_000 };

  function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  const cacheRatio = $derived(
    metrics.totalInputTokens > 0
      ? metrics.totalCacheReadTokens / metrics.totalInputTokens
      : 0
  );

  const cacheColor = $derived(cacheRatio > 0.5 ? 'color-green' : '');

  const rateWarn = $derived(
    metrics.requestsPerMin > LIMITS.reqPerMin * 0.8 ||
    metrics.inputTokensPerMin > LIMITS.inPerMin * 0.8 ||
    metrics.outputTokensPerMin > LIMITS.outPerMin * 0.8
  );

  // Pulse on new request — track totalRequests changes
  let prevTotal = $state(0);
  let pulse = $state(false);

  $effect(() => {
    if (metrics.totalRequests > prevTotal) {
      pulse = true;
      prevTotal = metrics.totalRequests;
      setTimeout(() => { pulse = false; }, 600);
    }
  });
</script>

{#if visible && metrics.totalRequests > 0}
  <div
    class="token-bubble"
    class:pulse
    class:rate-warn={rateWarn}
    in:fly={{ y: -8, duration: 200, opacity: 0 }}
    out:fly={{ y: -8, duration: 150, opacity: 0 }}
  >
    <span class="dim">req:</span> {metrics.totalRequests}
    <span class="sep">&middot;</span>
    <span class="dim">in:</span> {fmt(metrics.totalInputTokens)}
    <span class="sep">&middot;</span>
    <span class="dim">out:</span> {fmt(metrics.totalOutputTokens)}
    <span class="sep">&middot;</span>
    {#if metrics.isWasm}
      <span class="dim">cached:</span> <span class="dim">N/A</span>
    {:else}
      <span class="dim">cached:</span> <span class={metrics.totalCachedGB > 0 ? 'cached-active' : ''}>{metrics.totalCachedGB.toFixed(2)}GB</span>
    {/if}
    {#if metrics.totalCacheReadTokens > 0}
      <span class="cache {cacheColor}">(cache: {fmt(metrics.totalCacheReadTokens)})</span>
    {/if}
  </div>
{/if}

<style>
  .token-bubble {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    line-height: 1;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(124, 109, 250, 0.08);
    border: 1px solid rgba(124, 109, 250, 0.18);
    backdrop-filter: blur(8px);
    color: var(--color-text2);
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
  }

  .token-bubble.rate-warn {
    border-color: rgba(255, 160, 50, 0.4);
    background: rgba(255, 160, 50, 0.08);
    color: var(--color-text1);
  }

  .token-bubble.pulse {
    animation: token-pulse 0.6s ease-out;
  }

  .dim {
    opacity: 0.5;
  }

  .sep {
    opacity: 0.3;
  }

  .cache {
    opacity: 0.6;
    font-size: 9px;
  }

  .cached-active {
    color: var(--color-teal, #3ecfb2);
  }

  .color-green {
    color: var(--color-teal, #3ecfb2);
    opacity: 0.8;
  }

  @keyframes token-pulse {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.04); }
    100% { transform: scale(1); }
  }
</style>
