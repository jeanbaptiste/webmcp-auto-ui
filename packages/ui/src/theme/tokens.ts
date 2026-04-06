/**
 * Design tokens for light and dark themes.
 * These map directly to CSS custom properties injected by ThemeProvider.
 */

export interface ThemeTokens {
  'color-bg': string;
  'color-surface': string;
  'color-surface2': string;
  'color-border': string;
  'color-border2': string;
  'color-accent': string;
  'color-accent2': string;
  'color-amber': string;
  'color-teal': string;
  'color-text1': string;
  'color-text2': string;
}

export type ThemeMode = 'light' | 'dark';

export type ThemeOverrides = Partial<ThemeTokens>;

export const DARK_TOKENS: ThemeTokens = {
  'color-bg':       '#0e0e11',
  'color-surface':  '#16161a',
  'color-surface2': '#1e1e24',
  'color-border':   'rgba(255,255,255,0.07)',
  'color-border2':  'rgba(255,255,255,0.14)',
  'color-accent':   '#7c6dfa',
  'color-accent2':  '#fa6d7c',
  'color-amber':    '#f0a050',
  'color-teal':     '#3ecfb2',
  'color-text1':    '#e8e8f0',
  'color-text2':    '#a0a0b8',
};

export const LIGHT_TOKENS: ThemeTokens = {
  'color-bg':       '#f8f8fc',
  'color-surface':  '#ffffff',
  'color-surface2': '#f0f0f6',
  'color-border':   'rgba(0,0,0,0.08)',
  'color-border2':  'rgba(0,0,0,0.14)',
  'color-accent':   '#6c5ce7',
  'color-accent2':  '#e84855',
  'color-amber':    '#d48806',
  'color-teal':     '#0d9488',
  'color-text1':    '#1a1a2e',
  'color-text2':    '#64648c',
};

export const THEME_MAP: Record<ThemeMode, ThemeTokens> = {
  dark: DARK_TOKENS,
  light: LIGHT_TOKENS,
};
