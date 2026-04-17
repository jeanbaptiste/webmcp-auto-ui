// ---------------------------------------------------------------------------
// AutoUI WebMCP Server — built-in UI widgets + canvas/recall tools
// ---------------------------------------------------------------------------

import { createWebMcpServer, parseFrontmatter } from '@webmcp-auto-ui/core';

// ---------------------------------------------------------------------------
// Inline recipes (frontmatter + body)
// ---------------------------------------------------------------------------

const RECIPES: string[] = [
  // ── stat ────────────────────────────────────────────────────────────────
  `---
widget: stat
description: Key statistic (KPI, counter, total). Label + value + optional trend.
schema:
  type: object
  required:
    - label
    - value
  properties:
    label:
      type: string
    value:
      type: string
    trend:
      type: string
    trendDir:
      type: string
      enum: [up, down, neutral]
---

## When to use
Display a single key figure (KPI, total, counter).

## How to use
Call widget_display({name: "stat", params: {label: "Total", value: "42"}}).
`,

  // ── kv ──────────────────────────────────────────────────────────────────
  `---
widget: kv
description: Key-value pairs (properties, metadata, details).
schema:
  type: object
  required:
    - rows
  properties:
    title:
      type: string
    rows:
      type: array
      items:
        type: array
        items:
          type: string
        minItems: 2
        maxItems: 2
---

## When to use
Display properties or metadata as key/value pairs.

## How to use
Call widget_display({name: "kv", params: {rows: [["Nom", "Dupont"], ["Age", "42"]]}}).
`,

  // ── list ─────────────────────────────────────────────────────────────────
  `---
widget: list
description: Ordered list of items.
schema:
  type: object
  required:
    - items
  properties:
    title:
      type: string
    items:
      type: array
      items:
        type: string
---

## When to use
Display a simple list of text items.

## How to use
Call widget_display({name: "list", params: {items: ["A", "B", "C"]}}).
`,

  // ── chart ────────────────────────────────────────────────────────────────
  `---
widget: chart
description: Simple bar chart. Labels + numeric values.
schema:
  type: object
  required:
    - bars
  properties:
    title:
      type: string
    bars:
      type: array
      items:
        type: array
---

## When to use
Pour un graphique a barres simple avec des labels et valeurs numeriques.

## How to use
Call widget_display({name: "chart", params: {bars: [["Jan", 10], ["Fev", 20]]}}).
`,

  // ── alert ────────────────────────────────────────────────────────────────
  `---
widget: alert
description: System alert or notification.
schema:
  type: object
  required:
    - title
  properties:
    title:
      type: string
    message:
      type: string
    level:
      type: string
      enum: [info, warn, error]
---

## When to use
Display an alert, warning, or notification.

## How to use
Call widget_display({name: "alert", params: {title: "Attention", message: "Disque plein", level: "warn"}}).
`,

  // ── code ─────────────────────────────────────────────────────────────────
  `---
widget: code
description: Code block with syntax highlighting.
schema:
  type: object
  required:
    - content
  properties:
    lang:
      type: string
    content:
      type: string
---

## When to use
Display a source code snippet with syntax highlighting.

## How to use
Call widget_display({name: "code", params: {lang: "python", content: "print('hello')"}}).
`,

  // ── text ─────────────────────────────────────────────────────────────────
  `---
widget: text
description: Free-form text paragraph.
schema:
  type: object
  required:
    - content
  properties:
    content:
      type: string
---

## When to use
Display a free-form text block.

## How to use
Call widget_display({name: "text", params: {content: "Texte explicatif..."}}).
`,

  // ── actions ──────────────────────────────────────────────────────────────
  `---
widget: actions
description: Row of action buttons.
schema:
  type: object
  required:
    - buttons
  properties:
    buttons:
      type: array
      items:
        type: object
        required:
          - label
        properties:
          label:
            type: string
          primary:
            type: boolean
---

## When to use
Pour proposer des actions cliquables a l'utilisateur.

## How to use
Call widget_display({name: "actions", params: {buttons: [{label: "OK", primary: true}, {label: "Annuler"}]}}).
`,

  // ── tags ─────────────────────────────────────────────────────────────────
  `---
widget: tags
description: Group of tags/badges.
schema:
  type: object
  required:
    - tags
  properties:
    label:
      type: string
    tags:
      type: array
      items:
        type: object
        required:
          - text
        properties:
          text:
            type: string
          active:
            type: boolean
---

## When to use
Display tags, categories, or badges.

## How to use
Call widget_display({name: "tags", params: {tags: [{text: "JS", active: true}, {text: "TS"}]}}).
`,

  // ── data-table ───────────────────────────────────────────────────────────
  `---
widget: data-table
description: Sortable data table with configurable columns.
schema:
  type: object
  required:
    - rows
  properties:
    title:
      type: string
    columns:
      type: array
      items:
        type: object
        required:
          - key
          - label
        properties:
          key:
            type: string
          label:
            type: string
          align:
            type: string
            enum: [left, center, right]
    rows:
      type: array
      items:
        type: object
---

## When to use
Display structured data in a table with column sorting.

## How to use
Call widget_display({name: "data-table", params: {columns: [{key:"name",label:"Nom"}], rows: [{name:"Alice"}]}}).
`,

  // ── timeline ─────────────────────────────────────────────────────────────
  `---
widget: timeline
description: Event timeline with statuses.
schema:
  type: object
  required:
    - events
  properties:
    title:
      type: string
    events:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          date:
            type: string
          title:
            type: string
          description:
            type: string
          status:
            type: string
            enum: [done, active, pending]
---

## When to use
Display a sequence of events over time.

## How to use
Call widget_display({name: "timeline", params: {events: [{title: "Debut", date: "2024-01", status: "done"}]}}).
`,

  // ── profile ──────────────────────────────────────────────────────────────
  `---
widget: profile
description: Profile card with avatar, fields, and statistics.
schema:
  type: object
  required:
    - name
  properties:
    name:
      type: string
    subtitle:
      type: string
    fields:
      type: array
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
          value:
            type: string
    stats:
      type: array
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
          value:
            type: string
---

## When to use
Display a person or entity card with structured fields.

## How to use
Call widget_display({name: "profile", params: {name: "Alice", fields: [{label:"Role", value:"Dev"}]}}).

## Common mistakes
- NEVER invent avatar URLs — only use those returned by MCP tools. Without a URL, the widget displays initials automatically.
`,

  // ── trombinoscope ────────────────────────────────────────────────────────
  `---
widget: trombinoscope
description: Portrait grid (trombinoscope). People with name, subtitle, badge.
schema:
  type: object
  required:
    - people
  properties:
    title:
      type: string
    people:
      type: array
      items:
        type: object
        required:
          - name
        properties:
          name:
            type: string
          subtitle:
            type: string
          badge:
            type: string
          color:
            type: string
    columns:
      type: number
---

## When to use
Display a grid of people (team, assembly, etc.).

## How to use
Call widget_display({name: "trombinoscope", params: {people: [{name: "Alice", badge: "Lead"}]}}).

## Common mistakes
- NEVER invent URLs for the avatar field — only use those returned by MCP tools. Without a URL, the widget displays initials automatically.
`,

  // ── json-viewer ──────────────────────────────────────────────────────────
  `---
widget: json-viewer
description: Interactive explorable JSON tree.
schema:
  type: object
  required:
    - data
  properties:
    title:
      type: string
    data: {}
    maxDepth:
      type: number
    expanded:
      type: boolean
---

## When to use
Display a complex JSON structure interactively.

## How to use
Call widget_display({name: "json-viewer", params: {data: {a: 1, b: {c: 2}}}}).
`,

  // ── hemicycle ────────────────────────────────────────────────────────────
  `---
widget: hemicycle
description: SVG hemicycle (parliamentary composition by group).
schema:
  type: object
  required:
    - groups
  properties:
    title:
      type: string
    groups:
      type: array
      items:
        type: object
        required:
          - id
          - label
          - seats
          - color
        properties:
          id:
            type: string
          label:
            type: string
          seats:
            type: number
          color:
            type: string
    totalSeats:
      type: number
---

## When to use
Pour visualiser la composition d'une assemblee parlementaire.

## How to use
Call widget_display({name: "hemicycle", params: {groups: [{id:"g1", label:"Parti A", seats:120, color:"#e63946"}]}}).
`,

  // ── chart-rich ───────────────────────────────────────────────────────────
  `---
widget: chart-rich
description: Rich chart (bar, line, area, pie, donut) with multiple series.
schema:
  type: object
  required:
    - data
  properties:
    title:
      type: string
    type:
      type: string
      enum: [bar, line, area, pie, donut]
    labels:
      type: array
      items:
        type: string
    data:
      type: array
      items:
        type: object
        required:
          - values
        properties:
          label:
            type: string
          values:
            type: array
            items:
              type: number
          color:
            type: string
---

## When to use
Pour des graphiques multi-series (barres, lignes, aires, camembert, donut).

## How to use
Call widget_display({name: "chart-rich", params: {type: "bar", labels: ["Q1","Q2"], data: [{label:"Ventes", values:[10,20]}]}}).
`,

  // ── cards ────────────────────────────────────────────────────────────────
  `---
widget: cards
description: Card grid (results, records, entities).
schema:
  type: object
  required:
    - cards
  properties:
    title:
      type: string
    cards:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          title:
            type: string
          description:
            type: string
          subtitle:
            type: string
          tags:
            type: array
            items:
              type: string
---

## When to use
Display results, records, or entities as a card grid.

## How to use
Call widget_display({name: "cards", params: {cards: [{title: "Projet A", description: "En cours"}]}}).

## Common mistakes
- NEVER invent image URLs for the image field — only use those returned by MCP tools. If no URL is available, do not include an image field.
`,

  // ── sankey ───────────────────────────────────────────────────────────────
  `---
widget: sankey
description: Sankey flow diagram (votes, co-signatures, paths).
schema:
  type: object
  required:
    - nodes
    - links
  properties:
    title:
      type: string
    nodes:
      type: array
      items:
        type: object
        required:
          - id
          - label
        properties:
          id:
            type: string
          label:
            type: string
          color:
            type: string
    links:
      type: array
      items:
        type: object
        required:
          - source
          - target
          - value
        properties:
          source:
            type: string
          target:
            type: string
          value:
            type: number
---

## When to use
Pour visualiser des flux entre categories (votes, parcours, transferts).

## How to use
Call widget_display({name: "sankey", params: {nodes: [{id:"a", label:"A"}], links: [{source:"a", target:"b", value:10}]}}).
`,

  // ── log ──────────────────────────────────────────────────────────────────
  `---
widget: log
description: Log stream with level, timestamp, and source.
schema:
  type: object
  required:
    - entries
  properties:
    title:
      type: string
    entries:
      type: array
      items:
        type: object
        required:
          - message
        properties:
          timestamp:
            type: string
          level:
            type: string
            enum: [debug, info, warn, error]
          message:
            type: string
          source:
            type: string
---

## When to use
Display a stream of logs or system events.

## How to use
Call widget_display({name: "log", params: {entries: [{message: "Started", level: "info", timestamp: "12:00"}]}}).
`,

  // ── gallery ──────────────────────────────────────────────────────────────
  `---
widget: gallery
description: Image gallery with lightbox.
schema:
  type: object
  required:
    - images
  properties:
    title:
      type: string
    images:
      type: array
      items:
        type: object
        required:
          - src
        properties:
          src:
            type: string
          alt:
            type: string
          caption:
            type: string
    columns:
      type: number
---

## When to use
Display an image collection with lightbox navigation.

## How to use
Call widget_display({name: "gallery", params: {images: [{src: "https://...", alt: "Photo 1"}]}}).

## Common mistakes
- NEVER fabricate image URLs — only use those returned by MCP tools
- Always provide an alt for accessibility
`,

  // ── carousel ─────────────────────────────────────────────────────────────
  `---
widget: carousel
description: Slide carousel (images, content) with navigation and auto-play.
schema:
  type: object
  required:
    - slides
  properties:
    title:
      type: string
    slides:
      type: array
      items:
        type: object
        properties:
          src:
            type: string
          title:
            type: string
          subtitle:
            type: string
          content:
            type: string
    autoPlay:
      type: boolean
    interval:
      type: number
---

## When to use
Pour presenter du contenu en diaporama avec navigation.

## How to use
Call widget_display({name: "carousel", params: {slides: [{src: "https://...", title: "Slide 1"}]}}).

## Common mistakes
- NEVER fabricate image URLs for src — only use those returned by MCP tools
`,

  // ── map ──────────────────────────────────────────────────────────────────
  `---
widget: map
description: Interactive Leaflet map with markers. Dark CARTO basemap.
schema:
  type: object
  properties:
    title:
      type: string
    center:
      type: object
      description: Centre de la carte
      required:
        - lat
        - lng
      properties:
        lat:
          type: number
        lng:
          type: number
    zoom:
      type: number
      description: Niveau de zoom (1-18)
    height:
      type: string
      description: Hauteur CSS de la carte (ex "400px")
    markers:
      type: array
      items:
        type: object
        required:
          - lat
          - lng
        properties:
          lat:
            type: number
          lng:
            type: number
          label:
            type: string
          color:
            type: string
---

## When to use
Display a geographic map with markers.

## How to use
Call widget_display({name: "map", params: {center: {lat: 48.8, lng: 2.3}, zoom: 12, markers: [{lat: 48.8, lng: 2.3, label: "Paris"}]}}).
`,

  // ── stat-card ────────────────────────────────────────────────────────────
  `---
widget: stat-card
description: Enriched KPI with unit, delta, and colored variant (success/warning/error/info).
schema:
  type: object
  required:
    - label
    - value
  properties:
    label:
      type: string
    value:
      type: string
    unit:
      type: string
      description: Unite affichee apres la valeur (ex "%", "km")
    delta:
      type: string
      description: Variation affichee (ex "+12%")
    trend:
      type: string
      enum: [up, down, flat]
    previousValue:
      type: string
    variant:
      type: string
      enum: [default, success, warning, error, info]
---

## When to use
Pour un KPI enrichi avec delta, unite et variante de couleur.

## How to use
Call widget_display({name: "stat-card", params: {label: "Uptime", value: "99.9", unit: "%", trend: "up", variant: "success"}}).
`,

  // ── grid-data ────────────────────────────────────────────────────────────
  `---
widget: grid-data
description: Tabular data grid with cell highlights (heatmap, comparison).
schema:
  type: object
  required:
    - rows
  properties:
    title:
      type: string
    columns:
      type: array
      items:
        type: object
        required:
          - key
          - label
        properties:
          key:
            type: string
          label:
            type: string
          width:
            type: string
    rows:
      type: array
      description: Tableau de tableaux de valeurs (row-major)
      items:
        type: array
    highlights:
      type: array
      description: Cellules a coloriser
      items:
        type: object
        required:
          - row
          - col
        properties:
          row:
            type: number
          col:
            type: number
          color:
            type: string
---

## When to use
Pour des grilles de donnees avec mise en valeur de cellules (heatmap, comparaison).

## How to use
Call widget_display({name: "grid-data", params: {columns: [{key:"a",label:"A"}], rows: [[1,2],[3,4]], highlights: [{row:0,col:1,color:"#ff0"}]}}).
`,

  // ── d3 ───────────────────────────────────────────────────────────────────
  `---
widget: d3
description: D3.js visualization (hex-heatmap, radial, treemap, force graph).
schema:
  type: object
  required:
    - preset
    - data
  properties:
    title:
      type: string
    preset:
      type: string
      enum: [hex-heatmap, radial, treemap, force]
    data:
      type: object
    config:
      type: object
---

## When to use
Pour des visualisations avancees D3.js (heatmap hexagonale, radial, treemap, graphe de force).

## How to use
Call widget_display({name: "d3", params: {preset: "treemap", data: {name: "root", children: [...]}}}).
`,

  // ── js-sandbox ───────────────────────────────────────────────────────────
  `---
widget: js-sandbox
description: JavaScript sandbox in a secure iframe. Arbitrary code with DOM and fetch access.
schema:
  type: object
  required:
    - code
  properties:
    title:
      type: string
      description: Titre affiche en haut du bloc
    code:
      type: string
      description: Code JavaScript a executer (acces a window, document, fetch)
    html:
      type: string
      description: HTML initial injecte dans div#root avant execution du code
    css:
      type: string
      description: CSS injecte dans le head de l'iframe
    height:
      type: string
      description: Hauteur CSS de l'iframe (ex "400px", "50vh")
---

## When to use
Pour des visualisations custom, animations, ou prototypes interactifs en JS pur.

## How to use
Call widget_display({name: "js-sandbox", params: {code: "document.getElementById('root').innerHTML = '<h1>Hello</h1>'"}}).
`,

  // ── recipe-browser ──────────────────────────────────────────────────────
  `---
widget: recipe-browser
description: Displays available recipes as interactive cards and allows browsing each recipe's details.
group: rich
schema:
  type: object
  required:
    - cards
  properties:
    title:
      type: string
    cards:
      type: array
      items:
        type: object
        required:
          - title
        properties:
          title:
            type: string
          description:
            type: string
          tags:
            type: array
            items:
              type: string
          meta:
            type: object
            properties:
              recipe_name:
                type: string
              server:
                type: string
    interactive:
      type: boolean
---

## When to use
Quand l'utilisateur veut voir les recettes disponibles, explorer les possibilites du serveur, ou comprendre comment utiliser un widget specifique.

## Comment

### Etape 1 — Lister les recettes
Appelle search_recipes() sur chaque serveur connecte (MCP et WebMCP) pour obtenir la liste des recettes.

### Etape 2 — Afficher en cartes interactives
Utilise widget_display({name: "cards", params: {...}}) avec le parametre interactive: true pour rendre les cartes cliquables :
widget_display({name: "cards", params: {title: "Recettes disponibles", cards: [{title: "Nom", description: "Description", tags: ["serveur"], meta: {recipe_name: "nom_technique", server: "nom_serveur"}}], interactive: true}})

Le champ meta est important : il sera renvoye dans l'evenement d'interaction quand l'utilisateur clique sur la carte.

### Etape 3 — Reagir au clic
Quand l'utilisateur clique sur une carte, tu recevras un message d'interaction contenant les donnees de meta. Utilise meta.recipe_name et meta.server pour :
1. Appeler get_recipe(meta.recipe_name) sur le bon serveur
2. Afficher le contenu dans un widget code avec lang: 'markdown'
3. Lier les deux widgets : reutiliser le widget detail existant via canvas('update', ...) au lieu d'en creer un nouveau a chaque clic.

## Common mistakes
- Ne pas oublier interactive: true dans les cartes — sans ca, les clics ne remontent pas
- Ne pas creer un nouveau widget detail a chaque clic — reutiliser l'existant via canvas('update', ...)
- Les recettes MCP et WebMCP ont des noms de serveur differents — utiliser le bon prefixe pour get_recipe()
`,
];

// ---------------------------------------------------------------------------
// Native widget names — derived from RECIPES frontmatter
// ---------------------------------------------------------------------------

/** Derived from RECIPES frontmatter — always in sync with registered widgets */
export const NATIVE_WIDGET_NAMES = RECIPES.map(r => {
  const match = r.match(/widget:\s*(\S+)/);
  return match ? match[1] : '';
}).filter(Boolean) as string[];

// ---------------------------------------------------------------------------
// Server creation
// ---------------------------------------------------------------------------

const autoui = createWebMcpServer('autoui', {
  description: 'Built-in UI widgets (stat, chart, hemicycle, gallery, carousel, ...)',
});

// Register all native widgets (renderer = undefined, resolved by NATIVE_MAP in UI)
for (const recipe of RECIPES) {
  autoui.registerWidget(recipe, undefined);
}

// Expose recipe summaries to the UI browser
const parsedRecipes = RECIPES.map((md) => {
  const { frontmatter, body } = parseFrontmatter(md);
  return {
    name: (frontmatter.widget as string) ?? '',
    description: (frontmatter.description as string) ?? '',
    body,
  };
}).filter((r) => r.name);
autoui.setRecipes(parsedRecipes);

// ---------------------------------------------------------------------------
// Custom tool: canvas
// ---------------------------------------------------------------------------

autoui.addTool({
  name: 'canvas',
  description: 'Manipulate existing widgets on the canvas after they have been created by widget_display. Use this to update widget data, reposition, resize, restyle, or clear the entire canvas. Requires the widget ID returned by widget_display (except for the "clear" action which removes all widgets). Prefer "update" over creating a new widget when refreshing data — this avoids duplicate widgets and preserves layout. Do NOT use this to create new widgets — use widget_display instead.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['clear', 'update', 'move', 'resize', 'style'], description: 'The operation to perform. "clear" removes all widgets from the canvas (no id needed). "update" replaces the widget data (pass new params in params). "move" repositions a widget (params: {x, y}). "resize" changes dimensions (params: {width, height}). "style" applies CSS styles (params: {styles}).' },
      id: { type: 'string', description: 'The widget ID returned by widget_display, e.g. "w_abc123". Required for all actions except "clear". If omitted for non-clear actions, the operation will fail.' },
      params: { type: 'object', description: 'Action-specific parameters. For "update": the new widget data object (same structure as widget_display params). For "move": {x: number, y: number}. For "resize": {width: string, height: string} (CSS values). For "style": {styles: {color: "...", background: "...", ...}} (CSS properties). Not used for "clear".' },
    },
    required: ['action'],
  },
  execute: async (params) => {
    const action = params.action as string;
    const id = params.id as string;
    switch (action) {
      case 'clear': return { ok: true, message: 'Canvas cleared.' };
      case 'update': return { ok: true, message: `Widget ${id} updated.` };
      case 'move': return { ok: true, message: `Widget ${id} moved.` };
      case 'resize': return { ok: true, message: `Widget ${id} resized.` };
      case 'style': return { ok: true, message: `Widget ${id} styled.` };
      default: return { error: `Unknown canvas action: ${action}` };
    }
  },
});

// ---------------------------------------------------------------------------
// Custom tool: recall
// ---------------------------------------------------------------------------

autoui.addTool({
  name: 'recall',
  description: 'Re-read the full, untruncated result of a previous tool call that was summarized or truncated in the conversation. When tool results are large (e.g. long API responses, big datasets), the agent loop stores the full result and returns a summary with an identifier. Use recall with that identifier to retrieve the complete data. This is essential when you need details that were omitted from the summary. Do NOT use this for tool calls whose results were already shown in full — it will return an error.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The tool call identifier from the summary, e.g. "toolu_abc123". This ID is provided in the truncated result message when a tool response exceeds the display limit.' },
    },
    required: ['id'],
  },
  execute: async () => {
    // Recall is intercepted by the agent loop (resultBuffer) before reaching here.
    return { error: 'Recall must be handled by the agent loop, not the WebMCP server.' };
  },
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export { autoui };
