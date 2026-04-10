import type { ThemeOverrides } from '@webmcp-auto-ui/ui';

export interface ThemePreset {
  id: string;
  label: string;
  mode: 'light' | 'dark';
  overrides: ThemeOverrides;
}

export const PRESETS: ThemePreset[] = [
  {
    id: 'corporate',
    label: 'Corporate',
    mode: 'dark',
    overrides: {
      'color-bg':       '#0b0f19',
      'color-surface':  '#111827',
      'color-surface2': '#1f2937',
      'color-border':   'rgba(148,163,184,0.12)',
      'color-border2':  'rgba(148,163,184,0.22)',
      'color-accent':   '#3b82f6',
      'color-accent2':  '#ef4444',
      'color-amber':    '#f59e0b',
      'color-teal':     '#10b981',
      'color-text1':    '#f1f5f9',
      'color-text2':    '#94a3b8',
    },
  },
  {
    id: 'pastel',
    label: 'Pastel',
    mode: 'light',
    overrides: {
      'color-bg':       '#fef7f0',
      'color-surface':  '#ffffff',
      'color-surface2': '#fdf2e9',
      'color-border':   'rgba(180,140,100,0.12)',
      'color-border2':  'rgba(180,140,100,0.20)',
      'color-accent':   '#8b5cf6',
      'color-accent2':  '#f472b6',
      'color-amber':    '#d97706',
      'color-teal':     '#34d399',
      'color-text1':    '#3f3f46',
      'color-text2':    '#78716c',
    },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    mode: 'dark',
    overrides: {
      'color-bg':       '#0a0a0f',
      'color-surface':  '#12121a',
      'color-surface2': '#1a1a28',
      'color-border':   'rgba(0,255,170,0.10)',
      'color-border2':  'rgba(0,255,170,0.20)',
      'color-accent':   '#00ffaa',
      'color-accent2':  '#ff2d6f',
      'color-amber':    '#ffcc00',
      'color-teal':     '#00e5ff',
      'color-text1':    '#e0ffe0',
      'color-text2':    '#88ccaa',
    },
  },
];
