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
    if (n >= 1_000_000) return Math.round(n / 1_000_000) + 'M';
    if (n >= 1_000) return Math.round(n / 1_000) + 'K';
    return String(Math.round(n));
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
    {#if !metrics.isWasm && metrics.totalCacheReadTokens > 0}
      <span class="cached-active">Cached {fmt(metrics.totalCacheReadTokens)}</span>
    {/if}
    {#if metrics.isWasm}
      <span>Req {metrics.requestsPerMin}/min</span>
      <span>Out {fmt(metrics.outputTokensPerMin)}/min</span>
    {:else}
      <span class:warn={metrics.requestsPerMin > LIMITS.reqPerMin * 0.8}>Req {metrics.requestsPerMin}/min</span> <span class="limit">({fmt(LIMITS.reqPerMin)} max)</span>
      <span class:warn={metrics.inputTokensPerMin > LIMITS.inPerMin * 0.8}>In {fmt(metrics.inputTokensPerMin)}/min</span> <span class="limit">({fmt(LIMITS.inPerMin)} max)</span>
      <span class:warn={metrics.outputTokensPerMin > LIMITS.outPerMin * 0.8}>Out {fmt(metrics.outputTokensPerMin)}/min</span> <span class="limit">({fmt(LIMITS.outPerMin)} max)</span>
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

  .limit {
    opacity: 0.35;
    font-size: 9px;
  }

  .sep {
    opacity: 0.3;
  }

  .warn {
    color: var(--color-amber, #f0a050);
    font-weight: 500;
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
