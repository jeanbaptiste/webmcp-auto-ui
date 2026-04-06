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

  interface Props {
    defaultMode?: ThemeMode;
    overrides?: ThemeOverrides;
    children: import('svelte').Snippet;
  }

  let { defaultMode = 'light', overrides = {}, children }: Props = $props();

  let mode = $state<ThemeMode>(defaultMode);

  function applyTokens() {
    if (typeof document === 'undefined') return;
    const tokens = { ...THEME_MAP[mode], ...overrides };
    const root = document.documentElement;
    for (const [key, value] of Object.entries(tokens)) {
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
    applyTokens();
  });
</script>

{@render children()}
