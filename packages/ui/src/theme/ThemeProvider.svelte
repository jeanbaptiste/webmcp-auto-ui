<script lang="ts" module>
  import { getContext, setContext } from 'svelte';
  import type { ThemeMode, ThemeOverrides } from './tokens.js';

  export interface ThemeAPI {
    readonly mode: ThemeMode;
    toggle: () => void;
    setMode: (m: ThemeMode) => void;
  }

  const THEME_CTX = Symbol('theme');

  export function getTheme(): ThemeAPI {
    return getContext<ThemeAPI>(THEME_CTX);
  }

  export function setThemeContext(api: ThemeAPI) {
    setContext(THEME_CTX, api);
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { THEME_MAP } from './tokens.js';

  /**
   * ThemeJSON is the full theme.json format a designer writes.
   * Pass it as the `theme` prop and it takes precedence over `overrides`.
   */
  export interface ThemeJSON {
    name?: string;
    tokens?: Record<string, string>;
    dark?: Record<string, string>;
  }

  interface Props {
    defaultMode?: ThemeMode;
    overrides?: ThemeOverrides;
    theme?: ThemeJSON;
    children: import('svelte').Snippet;
  }

  let { defaultMode = 'light', overrides = {}, theme, children }: Props = $props();

  let mode = $state<ThemeMode>(defaultMode);

  function applyTokens() {
    if (typeof document === 'undefined') return;

    // Layer 1: built-in tokens for the current mode
    let merged: Record<string, string> = { ...THEME_MAP[mode] };

    // Layer 2: theme.json tokens (light base + dark overrides)
    if (theme?.tokens) {
      Object.assign(merged, theme.tokens);
      if (mode === 'dark' && theme.dark) {
        Object.assign(merged, theme.dark);
      }
    }

    // Layer 3: inline overrides (highest priority)
    if (overrides) Object.assign(merged, overrides);

    const root = document.documentElement;
    for (const [key, value] of Object.entries(merged)) {
      root.style.setProperty(`--${key}`, value);
    }
    root.dataset.theme = mode;
  }

  function toggle() {
    mode = mode === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('webmcp-theme', mode); } catch {}
    applyTokens();
  }

  function setModeValue(m: ThemeMode) {
    mode = m;
    try { localStorage.setItem('webmcp-theme', mode); } catch {}
    applyTokens();
  }

  // Expose via context so any child can import { getTheme }
  setThemeContext({
    get mode() { return mode; },
    toggle,
    setMode: setModeValue,
  });

  onMount(() => {
    try {
      const stored = localStorage.getItem('webmcp-theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') mode = stored;
    } catch {}
    applyTokens();
  });

  $effect(() => {
    void overrides;
    void theme;
    applyTokens();
  });
</script>

{@render children()}
