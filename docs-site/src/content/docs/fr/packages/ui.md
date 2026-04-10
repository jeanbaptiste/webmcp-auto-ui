---
title: "@webmcp-auto-ui/ui"
description: 34+ composants Svelte 5, theme system, primitives, widgets riches et window manager
sidebar:
  order: 4
---

34+ composants Svelte 5 : theme system, primitives, block widgets, visualisations riches, et window manager.

## Theme system

### Setup

```svelte
<script>
  import { ThemeProvider } from '@webmcp-auto-ui/ui';
</script>

<ThemeProvider mode="dark">
  <slot />
</ThemeProvider>
```

### Token override

```svelte
<ThemeProvider mode="dark" overrides={{ '--color-primary': '#ff6600', '--radius': '0.5rem' }}>
  <slot />
</ThemeProvider>
```

### 11 tokens CSS

| Token | Role |
|-------|------|
| `color-bg` | Fond de page |
| `color-surface` | Fond carte/panel |
| `color-surface2` | Surface secondaire |
| `color-border` | Bordure primaire |
| `color-border2` | Bordure secondaire |
| `color-accent` | Accent primaire (boutons, liens) |
| `color-accent2` | Accent secondaire / danger |
| `color-amber` | Warning, caution |
| `color-teal` | Succes, positif |
| `color-text1` | Texte primaire |
| `color-text2` | Texte secondaire |

## Composants base (shadcn-svelte)

| Composant | Description |
|-----------|-------------|
| `Button` | Bouton avec variantes (default, destructive, outline, ghost, link) |
| `Input` | Champ texte avec label/error |
| `Badge` | Badge inline avec couleurs |
| `NativeSelect` | Wrapper `<select>` natif |
| `Tooltip` | Tooltip au survol |
| `Dialog` | Modal dialog avec header/footer |

## Blocs simples (9)

| Composant | Block type | Agent tool | Description |
|-----------|-----------|------------|-------------|
| `StatBlock` | `stat` | `render_stat` | KPI unique avec trend |
| `KVBlock` | `kv` | `render_kv` | Paires cle-valeur |
| `ListBlock` | `list` | `render_list` | Liste a puces |
| `ChartBlock` | `chart` | `render_chart` | Bar chart simple |
| `AlertBlock` | `alert` | `render_alert` | Banniere d'alerte |
| `CodeBlock` | `code` | `render_code` | Code syntax-highlighted |
| `TextBlock` | `text` | `render_text` | Paragraphe texte |
| `ActionsBlock` | `actions` | `render_actions` | Boutons d'action |
| `TagsBlock` | `tags` | `render_tags` | Groupe de tags |

## Widgets riches (16)

| Composant | Block type | Description |
|-----------|-----------|-------------|
| `StatCard` | `stat-card` | Stat enrichie avec sparkline |
| `DataTable` | `data-table` | Table triable |
| `Timeline` | `timeline` | Chronologie d'evenements |
| `ProfileCard` | `profile` | Fiche profil avec avatar |
| `Trombinoscope` | `trombinoscope` | Grille de portraits |
| `JsonViewer` | `json-viewer` | Arbre JSON interactif |
| `Hemicycle` | `hemicycle` | Hemicycle parlementaire SVG |
| `Chart` | `chart-rich` | Multi-series (bar/line/area/pie/donut) |
| `Cards` | `cards` | Grille de content cards |
| `GridData` | `grid-data` | Grille spreadsheet |
| `Sankey` | `sankey` | Diagramme de flux D3 |
| `MapView` | `map` | Carte Leaflet avec markers |
| `D3Widget` | `d3` | Presets D3 (hex-heatmap, radial, treemap, force) |
| `LogViewer` | `log` | Stream de logs avec niveaux |
| `Gallery` | `gallery` | Galerie d'images avec lightbox |
| `Carousel` | `carousel` | Carousel de slides avec auto-play |

## Window Manager

| Composant | Description |
|-----------|-------------|
| `Pane` | Fenetre avec title bar, resize handles, close/minimize |
| `TilingLayout` | Tiling automatique (horizontal/vertical) |
| `FloatingLayout` | Fenetres flottantes avec z-index, collapse/expand |
| `FlexLayout` | Auto-grid avec slider de taille |
| `StackLayout` | Onglets empiles (un visible a la fois) |

## Agent UI Widgets

| Composant | Description |
|-----------|-------------|
| `GemmaLoader` | Overlay flottant avec barre de progression, auto-collapse en pill |
| `TokenBubble` | Metriques temps reel : req/min, tokens input/output |
| `EphemeralBubble` | Notification ephemere |
| `RemoteMCPserversDemo` | Decouverte serveurs MCP demo |
| `SettingsPanel` | Sliders temperature, topK, maxTokens; affiche effectivePrompt en readonly |
| `AgentConsole` | Panneau scrollable de logs agent avec marqueurs d'iteration, tool calls, texte et metriques tokens |

## BlockRenderer

Point d'entree unique pour le rendu des blocs :

```svelte
<script>
  import { BlockRenderer } from '@webmcp-auto-ui/ui';
</script>

<BlockRenderer type="stat" data={{ label: 'Users', value: '1,204', trend: '+5%', trendDir: 'up' }} />
<BlockRenderer type="chart" data={{ title: 'Revenue', bars: [['Q1', 100], ['Q2', 140]] }} />
```

`BlockRenderer` dispatche `{ type, data }` vers le widget correspondant. C'est le point de rendu unique utilise par le canvas.

## FONC message bus

Bus de messages inter-composants inspire de FONC/STEPS d'Alan Kay. Les composants ne s'appellent jamais directement.

```ts
import { bus } from '@webmcp-auto-ui/ui';

// Enregistrer un composant
const unregister = bus.register('my-chart', 'Chart', ['data', 'theme'], (msg) => {
  console.log(`${msg.channel} from ${msg.from}:`, msg.payload);
});

// Envoyer a un composant specifique
bus.send('my-panel', 'my-chart', 'data', { values: [1, 2, 3] });

// Broadcast
bus.broadcast('my-panel', 'theme', { mode: 'dark' });

// Inspecter
bus.listPeers();  // [{ id: 'my-chart', type: 'Chart' }, ...]
```
