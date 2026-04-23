<script lang="ts">
  import { onMount } from 'svelte';
  import { getTheme } from '../theme/ThemeProvider.svelte';
  import { toggleUIScale, getUIScale, initUIScale, type UIScale } from '../theme/scale.js';
  import { THEME_MAP } from '../theme/tokens.js';

  let { compact = false }: { compact?: boolean } = $props();

  // Theme: prefer ThemeProvider context if available; fallback to dataset-driven
  // toggle so apps without a provider (notebook-viewer) still work.
  const themeCtx = getTheme();

  let mode = $state<'light' | 'dark'>('light');
  let scale = $state<UIScale>(1);

  function fallbackToggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('webmcp-theme', next); } catch {}
    const tokens = THEME_MAP[next];
    if (tokens) for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
    mode = next;
  }

  function onToggleTheme() {
    if (themeCtx) {
      themeCtx.toggle();
      mode = themeCtx.mode;
    } else {
      fallbackToggleTheme();
    }
  }

  function onToggleScale() {
    scale = toggleUIScale();
  }

  onMount(() => {
    initUIScale();
    scale = getUIScale();
    if (themeCtx) {
      mode = themeCtx.mode;
    } else {
      mode = (document.documentElement.dataset.theme === 'dark') ? 'dark' : 'light';
    }
  });

  // Keep `mode` in sync when the provider updates (e.g. from another component).
  $effect(() => {
    if (themeCtx) mode = themeCtx.mode;
  });
</script>

<div class="header-controls" class:compact>
  <button type="button" class="hc-btn" onclick={onToggleTheme} aria-label="Toggle theme"
          title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
    {mode === 'dark' ? '☀' : '☾'}
  </button>
  <button type="button" class="hc-btn" onclick={onToggleScale} aria-label="Toggle UI scale"
          title={scale === 1 ? 'Scale UI up (2×)' : 'Reset UI scale'}>
    {scale === 1 ? '2×' : '1×'}
  </button>
</div>

<style>
  .header-controls { display: inline-flex; gap: 4px; align-items: center; }
  .hc-btn {
    display: inline-flex; align-items: center; justify-content: center;
    height: 28px; min-width: 32px; padding: 0 8px;
    border: 1px solid var(--border2, var(--border, rgba(127,127,127,0.25)));
    background: transparent; color: var(--text2, currentColor);
    border-radius: 6px; cursor: pointer; font-size: 12px; line-height: 1;
    font-family: inherit; transition: background 0.15s ease, color 0.15s ease;
  }
  .hc-btn:hover { background: rgba(127,127,127,0.1); color: var(--text1, currentColor); }
  .compact .hc-btn { height: 24px; min-width: 28px; padding: 0 6px; font-size: 11px; }
</style>
