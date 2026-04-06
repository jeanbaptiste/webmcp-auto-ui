# Theming Guide

This guide explains how to define and apply a custom design system to any
webmcp-auto-ui project. No Svelte knowledge is required — you write a single
JSON file and the entire UI adapts.

---

## How it works

```
                          theme.json
                      (you write this)
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
        ThemeProvider     Tailwind CSS      Components
        (runtime)        (build-time)      (auto-adapt)
              |               |               |
              v               v               v
        Sets CSS vars    Generates        Read vars via
        on :root         utility classes  bg-surface, etc.
              |               |               |
              +-------+-------+               |
                      |                       |
                      v                       v
               Every element on the page picks up
               the same tokens — one change, everything updates
```

There is **one source of truth**: CSS custom properties on `:root`. The
`theme.json` file defines what those properties should be. The ThemeProvider
injects them at runtime. Tailwind reads them at build time. Every component
— whether it's a simple StatBlock or a complex Hemicycle — consumes them
automatically.

---

## Quick start

### 1. Create `theme.json` at your project root

```json
{
  "name": "my-dashboard",
  "tokens": {
    "color-bg":       "#fafafa",
    "color-surface":  "#ffffff",
    "color-surface2": "#f5f5f5",
    "color-border":   "rgba(0,0,0,0.06)",
    "color-border2":  "rgba(0,0,0,0.12)",
    "color-accent":   "#6c5ce7",
    "color-accent2":  "#e84855",
    "color-amber":    "#d48806",
    "color-teal":     "#0d9488",
    "color-text1":    "#1a1a2e",
    "color-text2":    "#8c8ca0"
  }
}
```

### 2. Pass it to ThemeProvider in your layout

```svelte
<script>
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
  import themeJson from '../theme.json';

  let { children } = $props();
</script>

<ThemeProvider defaultMode="light" overrides={themeJson.tokens}>
  {@render children()}
</ThemeProvider>
```

### 3. Done

Every component in the page now uses your colors, automatically.

---

## Token reference

### Core tokens

Every token maps to a CSS custom property `--{token-name}` and a Tailwind
utility class.

```
Token name        CSS variable          Tailwind class     Used for
─────────────────────────────────────────────────────────────────────
color-bg          --color-bg            bg-bg              Page background
color-surface     --color-surface       bg-surface         Card/panel bg
color-surface2    --color-surface2      bg-surface2        Nested surfaces,
                                                           table headers,
                                                           hover states
color-border      --color-border        border-border      Subtle borders
color-border2     --color-border2       border-border2     Stronger borders,
                                                           active states
color-accent      --color-accent        text-accent        Primary accent,
                                        bg-accent          links, buttons
color-accent2     --color-accent2       text-accent2       Destructive/error
                                        bg-accent2         accent
color-amber       --color-amber         text-amber         Warnings, trends
color-teal        --color-teal          text-teal          Success, positive
                                                           trends
color-text1       --color-text1         text-text1         Primary text
color-text2       --color-text2         text-text2         Secondary/muted
                                                           text
```

### How tokens flow through the UI

```
    theme.json                 CSS                    Component
    ──────────                 ───                    ─────────

    "color-accent":    -->   --color-accent    -->   class="text-accent"
    "#6c5ce7"                on :root                 |
                                                      v
                                                   color: var(--color-accent)
                                                      |
                                                      v
                                                   rendered as #6c5ce7
```

When you change the token value, **every component** using that token
updates — buttons, charts, links, stat cards, borders, everything.

---

## Dark mode

Add a `dark` key to override tokens for dark mode:

```json
{
  "name": "my-dashboard",
  "tokens": {
    "color-bg":      "#fafafa",
    "color-surface": "#ffffff",
    "color-text1":   "#1a1a2e"
  },
  "dark": {
    "color-bg":      "#0e0e11",
    "color-surface": "#16161a",
    "color-text1":   "#e8e8f0"
  }
}
```

Only override what changes — tokens not listed in `dark` keep their light
values. The toggle is handled by ThemeProvider:

```
    User clicks toggle
           |
           v
    ThemeProvider.toggle()
           |
           v
    Swaps token set (light <-> dark)
           |
           v
    Updates CSS variables on :root
           |
           v
    Every component re-renders with new colors
    (no page reload, instant)
```

The user's preference is persisted in `localStorage` and restored on next visit.

---

## Designing a theme

### Anatomy of a well-designed token set

```
    ┌─────────────────────────────────────────────┐
    │ Page          bg: color-bg                   │
    │                                              │
    │   ┌──────────────────────────────────────┐   │
    │   │ Card       bg: color-surface          │   │
    │   │            border: color-border       │   │
    │   │                                      │   │
    │   │   Title    color: color-text1        │   │
    │   │   Body     color: color-text2        │   │
    │   │                                      │   │
    │   │   ┌──────────────────────────────┐   │   │
    │   │   │ Nested    bg: color-surface2 │   │   │
    │   │   │           border: color-border│   │   │
    │   │   └──────────────────────────────┘   │   │
    │   │                                      │   │
    │   │   [ Button ]  bg: color-accent       │   │
    │   │               text: white            │   │
    │   │                                      │   │
    │   │   Link        color: color-accent    │   │
    │   │   Warning     color: color-amber     │   │
    │   │   Success     color: color-teal      │   │
    │   │   Error       color: color-accent2   │   │
    │   └──────────────────────────────────────┘   │
    └─────────────────────────────────────────────┘
```

### Contrast rules

For readability, maintain sufficient contrast between:

```
    Background layer        Text on it         Minimum contrast
    ──────────────          ──────────         ────────────────
    color-bg                color-text1        7:1 (WCAG AAA)
    color-surface           color-text1        7:1
    color-surface           color-text2        4.5:1 (WCAG AA)
    color-accent (bg)       white text         4.5:1
    color-accent2 (bg)      white text         4.5:1
```

Use a contrast checker (e.g. webaim.org/resources/contrastchecker) to verify.

### Color relationships

```
    Semantic meaning        Token              Typical values
    ────────────────        ─────              ──────────────

    Light mode:
    ┌─ background ───────── color-bg           #fafafa  (near-white)
    ├─ card surface ──────── color-surface      #ffffff  (white)
    ├─ nested/hover ──────── color-surface2     #f0f0f6  (very light gray)
    ├─ subtle line ───────── color-border       rgba(0,0,0,0.06)
    ├─ visible line ──────── color-border2      rgba(0,0,0,0.12)
    ├─ primary action ────── color-accent       #6c5ce7  (vivid)
    ├─ danger/error ──────── color-accent2      #e84855  (warm red)
    ├─ warning ───────────── color-amber        #d48806  (orange)
    ├─ success ───────────── color-teal         #0d9488  (green)
    ├─ body text ─────────── color-text1        #1a1a2e  (near-black)
    └─ caption/label ─────── color-text2        #64648c  (mid-gray)

    Dark mode (invert the luminance, keep the hue):
    ┌─ background ───────── color-bg           #0e0e11  (near-black)
    ├─ card surface ──────── color-surface      #16161a  (dark gray)
    ├─ nested/hover ──────── color-surface2     #1e1e24  (slightly lighter)
    ├─ subtle line ───────── color-border       rgba(255,255,255,0.07)
    ├─ visible line ──────── color-border2      rgba(255,255,255,0.14)
    ├─ primary action ────── color-accent       #7c6dfa  (brighter for dark bg)
    ├─ body text ─────────── color-text1        #e8e8f0  (near-white)
    └─ caption/label ─────── color-text2        #a0a0b8  (light gray)
```

---

## Example: Language dashboard theme

To build a dashboard like a language-learning stats page with clean white
cards, subtle shadows, and colorful charts:

```json
{
  "name": "language-dashboard",
  "tokens": {
    "color-bg":       "#f7f7f7",
    "color-surface":  "#ffffff",
    "color-surface2": "#f0f0f0",
    "color-border":   "rgba(0,0,0,0.05)",
    "color-border2":  "rgba(0,0,0,0.10)",
    "color-accent":   "#58cc02",
    "color-accent2":  "#ff4b4b",
    "color-amber":    "#ffc800",
    "color-teal":     "#49c0b6",
    "color-text1":    "#3c3c3c",
    "color-text2":    "#afafaf"
  },
  "dark": {
    "color-bg":       "#131f24",
    "color-surface":  "#1a2b32",
    "color-surface2": "#223a44",
    "color-border":   "rgba(255,255,255,0.08)",
    "color-border2":  "rgba(255,255,255,0.15)",
    "color-text1":    "#e5e5e5",
    "color-text2":    "#8ea0a4"
  }
}
```

This produces:

```
    Light mode                          Dark mode

    ┌─────────────────────┐             ┌─────────────────────┐
    │ #f7f7f7 background  │             │ #131f24 background  │
    │                     │             │                     │
    │  ┌───────────────┐  │             │  ┌───────────────┐  │
    │  │ #fff card     │  │             │  │ #1a2b32 card  │  │
    │  │               │  │             │  │               │  │
    │  │ #3c3c3c text  │  │             │  │ #e5e5e5 text  │  │
    │  │ #afafaf label │  │             │  │ #8ea0a4 label │  │
    │  │               │  │             │  │               │  │
    │  │ [#58cc02 btn] │  │             │  │ [#58cc02 btn] │  │
    │  └───────────────┘  │             │  └───────────────┘  │
    └─────────────────────┘             └─────────────────────┘
```

---

## Embedding a theme in a HyperSkill

When you export a skill (recipe) from the Composer, the theme is embedded
in the `?hs=` URL:

```json
{
  "version": "1.0",
  "name": "my-skill",
  "theme": {
    "color-accent": "#58cc02",
    "color-bg": "#f7f7f7"
  },
  "blocks": [...]
}
```

When someone opens the URL, the ThemeProvider applies the embedded theme
overrides. This means **every shared skill carries its own look and feel**.

```
    Designer creates skill         User opens ?hs= URL
    with custom theme              
         |                              |
         v                              v
    Composer encodes               Viewer/Composer decodes
    theme + blocks                 theme + blocks
    into ?hs= param                    |
         |                              v
         v                         ThemeProvider applies
    Shareable URL                  embedded theme overrides
                                       |
                                       v
                                   Components render with
                                   the designer's colors
```

---

## Which components use which tokens

Every component in the library reads tokens from CSS variables. Here is the
mapping:

```
Component           bg          border       text         accent
────────────────    ──────────  ───────────  ───────────  ──────────
Card                surface     border       —            —
Panel               surface     border       text2 (hdr)  —
StatBlock           surface     border       text1/text2  teal/accent2
KVBlock             surface     border       text1/text2  —
ChartBlock          surface     border       text2        accent
Chart (rich)        surface     border       text1/text2  palette[0]
DataTable           surface     border       text1/text2  accent (sort)
ProfileCard         surface     border       text1/text2  accent (stats)
Hemicycle           surface     border       text1        per-group
Timeline            surface     border       text1/text2  teal/amber
Cards               surface     border       text1/text2  —
Gallery             surface     border       —            —
Carousel            surface     border       text1/text2  accent (dots)
StatCard            surface     border       text1        teal/accent2
AlertBlock          surface     accent2/amber text1       level-based
CodeBlock           bg          border       teal         —
TagsBlock           surface     border/teal  text2/teal   teal (active)
ActionsBlock        surface     border       text2        accent (primary)
LogViewer           bg          border       text2        teal/amber/accent2
JsonViewer          bg          border       accent       —
MapView             surface     border       text2        accent
Sankey              surface     border       text1        palette
GridData            surface     border       text1/text2  surface2 (highlight)
Trombinoscope       surface     border       text1/text2  per-person
Pane (WM)           surface     border       text1        accent
BlockRenderer       —           —            text2        — (fallback)
```

**Rule of thumb**: change `color-accent` to rebrand everything. Change
`color-bg` and `color-surface` to shift the overall lightness. Change
`color-text1` to adjust readability.

---

## Advanced: component-level overrides

Beyond global tokens, individual components accept style overrides through
their data/spec props. For example, a Chart's color palette:

```json
{
  "type": "chart-rich",
  "data": {
    "title": "Revenue",
    "type": "bar",
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "data": [
      { "label": "2025", "values": [120, 145, 160, 180], "color": "#58cc02" },
      { "label": "2024", "values": [100, 110, 130, 150], "color": "#afafaf" }
    ]
  }
}
```

The per-dataset `color` overrides the global palette for that specific chart
without affecting other components.

---

## Fonts

Fonts are loaded via Google Fonts in the layout. To change fonts:

1. Update the `<link>` tag in your `+layout.svelte`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet" />
```

2. Update your Tailwind config or the `body` rule in `app.css`:

```css
body { font-family: 'Inter', system-ui, sans-serif; }
```

The Tailwind preset defines `font-sans` and `font-mono` families. All
components use `font-sans` for UI text and `font-mono` for code/data.

---

## Checklist for a new theme

```
[ ] color-bg and color-surface have enough contrast (bg is darker/lighter)
[ ] color-text1 on color-surface passes WCAG AA (4.5:1 ratio)
[ ] color-text2 on color-surface passes WCAG AA (4.5:1 ratio)
[ ] color-accent on white/dark background passes WCAG AA
[ ] color-accent and color-accent2 are visually distinct
[ ] color-teal reads as "positive/success"
[ ] color-amber reads as "warning/attention"
[ ] color-accent2 reads as "error/danger"
[ ] Dark mode overrides tested (if provided)
[ ] Fonts loaded and applied
```
