# Theming -- Agent Guide

> This document is designed to be injected into an AI agent's context. It contains everything needed to create a theme.json for webmcp-auto-ui.

## What is theme.json?

A `theme.json` is a JSON object that defines color tokens for a webmcp-auto-ui interface. It is consumed by the `ThemeProvider` Svelte component, which injects the tokens as CSS custom properties (`--color-*`) on the document root element.

The ThemeProvider applies tokens in three layers (highest priority wins):
1. **Built-in tokens** for the current mode (light/dark)
2. **theme.json `tokens`** (light base) + `dark` overrides when in dark mode
3. **Inline `overrides`** prop (runtime overrides)

When you provide a `theme.json`, its `tokens` are applied on top of the built-in defaults. If the user switches to dark mode, the `dark` object is merged on top.

## Format

```json
{
  "name": "my-theme",
  "tokens": {
    "color-bg": "#ffffff",
    "color-surface": "#f5f5f5",
    "color-accent": "#3b82f6"
  },
  "dark": {
    "color-bg": "#0a0a0f",
    "color-surface": "#141419"
  }
}
```

- `name` (optional): human-readable theme name
- `tokens` (required): base tokens applied in both light and dark mode
- `dark` (optional): overrides applied only when dark mode is active

## The 11 Tokens

| Token | Role | Typical usage |
|-------|------|---------------|
| `color-bg` | Page background | `<body>` or root container background |
| `color-surface` | Card/panel background | Primary content areas, cards, modals |
| `color-surface2` | Secondary surface | Nested panels, table headers, hover states |
| `color-border` | Primary border | Card outlines, dividers (subtle) |
| `color-border2` | Secondary border | Stronger borders, active states, separators |
| `color-accent` | Primary accent | Buttons, links, active indicators, chart bars |
| `color-accent2` | Secondary accent / danger | Error states, destructive actions, secondary highlights |
| `color-amber` | Amber / warning | Warning alerts, caution badges, warm highlights |
| `color-teal` | Teal / success | Success states, positive trends, confirmation |
| `color-text1` | Primary text | Headings, body text, values |
| `color-text2` | Secondary text | Labels, captions, muted descriptions |

All tokens are consumed as CSS variables: `var(--color-bg)`, `var(--color-accent)`, etc.

## Workflow

When a designer says "I want a corporate blue theme":

1. Pick a primary blue for `color-accent` (e.g. `#2563eb`)
2. Set `color-bg` to a clean white/off-white
3. Set `color-surface` to white, `color-surface2` slightly gray
4. Set borders using low-opacity black: `rgba(0,0,0,0.08)` and `rgba(0,0,0,0.14)`
5. Pick `color-accent2` as a contrasting warm color (red/coral)
6. Keep `color-amber` warm, `color-teal` green/teal
7. Set `color-text1` dark, `color-text2` medium gray
8. Add a `dark` section: invert background to dark, surface to dark gray, adjust text to light, keep accent colors vibrant

## Example Themes

### Corporate (blue/white)

```json
{
  "name": "corporate",
  "tokens": {
    "color-bg": "#f8fafc",
    "color-surface": "#ffffff",
    "color-surface2": "#f1f5f9",
    "color-border": "rgba(0,0,0,0.08)",
    "color-border2": "rgba(0,0,0,0.16)",
    "color-accent": "#2563eb",
    "color-accent2": "#dc2626",
    "color-amber": "#d97706",
    "color-teal": "#0d9488",
    "color-text1": "#0f172a",
    "color-text2": "#64748b"
  },
  "dark": {
    "color-bg": "#0c1222",
    "color-surface": "#131c31",
    "color-surface2": "#1a2540",
    "color-border": "rgba(255,255,255,0.07)",
    "color-border2": "rgba(255,255,255,0.14)",
    "color-accent": "#3b82f6",
    "color-accent2": "#ef4444",
    "color-text1": "#e2e8f0",
    "color-text2": "#94a3b8"
  }
}
```

### Nature (green/beige)

```json
{
  "name": "nature",
  "tokens": {
    "color-bg": "#faf8f1",
    "color-surface": "#fffdf7",
    "color-surface2": "#f0ece2",
    "color-border": "rgba(90,70,40,0.1)",
    "color-border2": "rgba(90,70,40,0.2)",
    "color-accent": "#2d6a4f",
    "color-accent2": "#c1440e",
    "color-amber": "#b45309",
    "color-teal": "#14b8a6",
    "color-text1": "#1b3a26",
    "color-text2": "#6b7c6e"
  },
  "dark": {
    "color-bg": "#0d1a12",
    "color-surface": "#12231a",
    "color-surface2": "#1a3025",
    "color-border": "rgba(255,255,255,0.06)",
    "color-border2": "rgba(255,255,255,0.12)",
    "color-accent": "#40916c",
    "color-accent2": "#e85d26",
    "color-text1": "#d8e8dd",
    "color-text2": "#8fa898"
  }
}
```

### Neon (purple/black)

```json
{
  "name": "neon",
  "tokens": {
    "color-bg": "#0a0a12",
    "color-surface": "#12121e",
    "color-surface2": "#1a1a2e",
    "color-border": "rgba(255,255,255,0.06)",
    "color-border2": "rgba(255,255,255,0.12)",
    "color-accent": "#a855f7",
    "color-accent2": "#f43f5e",
    "color-amber": "#fbbf24",
    "color-teal": "#22d3ee",
    "color-text1": "#f0e6ff",
    "color-text2": "#9d8ab8"
  },
  "dark": {
    "color-bg": "#050508",
    "color-surface": "#0a0a14",
    "color-surface2": "#111120",
    "color-accent": "#c084fc",
    "color-accent2": "#fb7185",
    "color-text1": "#f5f0ff",
    "color-text2": "#a896c4"
  }
}
```

## Dark Mode

Add a `dark` key to your theme.json. It only needs to contain the tokens you want to override -- tokens not listed inherit from `tokens`.

Typically you override:
- `color-bg`, `color-surface`, `color-surface2` (dark backgrounds)
- `color-border`, `color-border2` (white-based opacity instead of black-based)
- `color-text1`, `color-text2` (light text on dark backgrounds)

Accent colors often stay the same or shift slightly brighter for dark mode.

```json
{
  "tokens": { "color-accent": "#6c5ce7" },
  "dark": { "color-accent": "#7c6dfa" }
}
```

## Embedding a Theme in a Skill

When creating a skill/recipe, include the theme tokens in the `theme` field:

```json
{
  "name": "my-dashboard",
  "blocks": [...],
  "theme": {
    "color-accent": "#2563eb",
    "color-bg": "#f8fafc"
  }
}
```

The `theme` field in a skill uses the flat token map (same as `tokens`), not the full `theme.json` structure.

## Constraints

- **WCAG contrast**: `color-text1` on `color-bg` must have a contrast ratio of at least 4.5:1. `color-text2` on `color-surface` should be at least 3:1.
- **All 11 tokens must be defined** in the `tokens` section. Missing tokens fall back to built-in defaults, which may clash with your palette.
- `color-text2` must be readable on both `color-bg` and `color-surface`.
- `color-accent` must be visible on `color-surface` (buttons, links).
- Borders (`color-border`, `color-border2`) should be subtle -- use rgba values.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| No `dark` section | Dark mode falls back to built-in dark tokens, clashing with your custom accent colors | Always provide a `dark` section |
| `color-border` and `color-border2` too similar | Borders lose their visual hierarchy | Use opacity 0.08 for border and 0.14+ for border2 |
| `color-text2` too light on light theme | Labels and captions become unreadable | Test text2 on both bg and surface backgrounds |
| Using hex for borders | No transparency, harsh lines on colored surfaces | Use rgba values for borders |
| `color-accent` too dark | Buttons and links invisible on dark surfaces | Ensure accent has enough brightness for dark mode |
| Forgetting `color-amber`/`color-teal` | Alerts and trend indicators use wrong colors | Always define all semantic colors |
