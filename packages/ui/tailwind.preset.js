/**
 * @webmcp-auto-ui/ui — shared Tailwind preset
 *
 * All apps import this preset instead of duplicating tokens.
 * Colors reference CSS custom properties so the ThemeProvider can
 * switch light/dark at runtime without rebuilding Tailwind.
 */
export default {
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        surface2: 'var(--color-surface2)',
        border:   'var(--color-border)',
        border2:  'var(--color-border2)',
        accent:   'var(--color-accent)',
        accent2:  'var(--color-accent2)',
        amber:    'var(--color-amber)',
        teal:     'var(--color-teal)',
        text1:    'var(--color-text1)',
        text2:    'var(--color-text2)',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Syne', 'system-ui', 'sans-serif'],
      },
      screens: {
        sm: '480px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
};
