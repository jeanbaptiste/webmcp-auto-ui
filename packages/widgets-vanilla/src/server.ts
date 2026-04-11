// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-vanilla — WebMCP Server with vanilla DOM renderers
// Zero framework dependencies. Pure HTML/CSS/JS.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import { render as renderStat } from './widgets/stat.js';
import { render as renderKv } from './widgets/kv.js';
import { render as renderList } from './widgets/list.js';
import { render as renderChart } from './widgets/chart.js';
import { render as renderAlert } from './widgets/alert.js';
import { render as renderCode } from './widgets/code.js';
import { render as renderText } from './widgets/text.js';
import { render as renderActions } from './widgets/actions.js';
import { render as renderTags } from './widgets/tags.js';
import { render as renderDataTable } from './widgets/data-table.js';
import { render as renderTimeline } from './widgets/timeline.js';
import { render as renderProfile } from './widgets/profile.js';
import { render as renderTrombinoscope } from './widgets/trombinoscope.js';
import { render as renderJsonViewer } from './widgets/json-viewer.js';
import { render as renderHemicycle } from './widgets/hemicycle.js';
import { render as renderChartRich } from './widgets/chart-rich.js';
import { render as renderCards } from './widgets/cards.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderLog } from './widgets/log.js';
import { render as renderStatCard } from './widgets/stat-card.js';
import { render as renderGridData } from './widgets/grid-data.js';
import { render as renderGallery } from './widgets/gallery.js';
import { render as renderCarousel } from './widgets/carousel.js';
import { render as renderMap } from './widgets/map.js';
import { render as renderD3 } from './widgets/d3.js';
import { render as renderJsSandbox } from './widgets/js-sandbox.js';

// ---------------------------------------------------------------------------
// Recipes (frontmatter + body) — inlined to avoid .md import dependency
// ---------------------------------------------------------------------------

const WIDGET_DEFS: Array<{ recipe: string; renderer: (container: HTMLElement, data: Record<string, unknown>) => void | (() => void) }> = [
  // ── stat ────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: stat
description: Statistique cle (KPI, compteur, total). Label + valeur + tendance optionnelle.
group: simple
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

## Quand utiliser
Pour afficher un chiffre cle unique (KPI, total, compteur).
`,
    renderer: renderStat,
  },

  // ── kv ──────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: kv
description: Paires cle-valeur (proprietes, metadonnees, details).
group: simple
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

## Quand utiliser
Pour afficher des proprietes ou metadonnees sous forme de paires cle/valeur.
`,
    renderer: renderKv,
  },

  // ── list ─────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: list
description: Liste ordonnee d'items.
group: simple
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

## Quand utiliser
Pour afficher une liste simple d'elements textuels.
`,
    renderer: renderList,
  },

  // ── chart ────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: chart
description: Graphique a barres simples. Labels + valeurs numeriques.
group: simple
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

## Quand utiliser
Pour un graphique a barres simple avec des labels et valeurs numeriques.
`,
    renderer: renderChart,
  },

  // ── alert ────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: alert
description: Alerte ou notification systeme.
group: simple
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

## Quand utiliser
Pour afficher une alerte, un avertissement ou une notification.
`,
    renderer: renderAlert,
  },

  // ── code ─────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: code
description: Bloc de code avec coloration syntaxique.
group: simple
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

## Quand utiliser
Pour afficher un extrait de code source.
`,
    renderer: renderCode,
  },

  // ── text ─────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: text
description: Paragraphe de texte libre.
group: simple
schema:
  type: object
  required:
    - content
  properties:
    content:
      type: string
---

## Quand utiliser
Pour afficher un bloc de texte libre.
`,
    renderer: renderText,
  },

  // ── actions ──────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: actions
description: Rangee de boutons d'action.
group: simple
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

## Quand utiliser
Pour proposer des actions cliquables a l'utilisateur.
`,
    renderer: renderActions,
  },

  // ── tags ─────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: tags
description: Groupe de tags/badges.
group: simple
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

## Quand utiliser
Pour afficher des tags, categories ou badges.
`,
    renderer: renderTags,
  },

  // ── data-table ───────────────────────────────────────────────────────────
  {
    recipe: `---
widget: data-table
description: Tableau de donnees triable avec colonnes configurables.
group: rich
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

## Quand utiliser
Pour afficher des donnees structurees en tableau avec tri par colonne.
`,
    renderer: renderDataTable,
  },

  // ── timeline ─────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: timeline
description: Chronologie d'evenements avec statuts.
group: rich
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

## Quand utiliser
Pour afficher une sequence d'evenements dans le temps.
`,
    renderer: renderTimeline,
  },

  // ── profile ──────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: profile
description: Fiche profil avec avatar, champs et statistiques.
group: rich
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

## Quand utiliser
Pour afficher une fiche personne ou entite avec champs structures.
`,
    renderer: renderProfile,
  },

  // ── trombinoscope ────────────────────────────────────────────────────────
  {
    recipe: `---
widget: trombinoscope
description: Grille de portraits (trombinoscope). Personnes avec nom, sous-titre, badge.
group: rich
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

## Quand utiliser
Pour afficher une grille de personnes (equipe, assemblee, etc.).
`,
    renderer: renderTrombinoscope,
  },

  // ── json-viewer ──────────────────────────────────────────────────────────
  {
    recipe: `---
widget: json-viewer
description: Arbre JSON interactif explorable.
group: rich
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

## Quand utiliser
Pour afficher une structure JSON complexe de maniere interactive.
`,
    renderer: renderJsonViewer,
  },

  // ── hemicycle ────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: hemicycle
description: Hemicycle SVG (composition parlementaire par groupe).
group: rich
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

## Quand utiliser
Pour visualiser la composition d'une assemblee parlementaire.
`,
    renderer: renderHemicycle,
  },

  // ── chart-rich ───────────────────────────────────────────────────────────
  {
    recipe: `---
widget: chart-rich
description: Graphique riche (bar, line, area, pie, donut) avec plusieurs series.
group: rich
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

## Quand utiliser
Pour des graphiques multi-series (barres, lignes, aires, camembert, donut).
`,
    renderer: renderChartRich,
  },

  // ── cards ────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: cards
description: Grille de cartes (resultats, dossiers, entites).
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
          subtitle:
            type: string
          tags:
            type: array
            items:
              type: string
---

## Quand utiliser
Pour afficher des resultats, dossiers ou entites en grille de cartes.
`,
    renderer: renderCards,
  },

  // ── sankey ───────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: sankey
description: Diagramme de flux Sankey (votes, co-signatures, parcours).
group: rich
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

## Quand utiliser
Pour visualiser des flux entre categories (votes, parcours, transferts).
`,
    renderer: renderSankey,
  },

  // ── log ──────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: log
description: Flux de logs avec niveau, timestamp et source.
group: rich
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

## Quand utiliser
Pour afficher un flux de logs ou d'evenements systeme.
`,
    renderer: renderLog,
  },

  // ── stat-card ────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: stat-card
description: KPI enrichi avec unite, delta et variante coloree (success/warning/error/info).
group: rich
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
    delta:
      type: string
    trend:
      type: string
      enum: [up, down, flat]
    previousValue:
      type: string
    variant:
      type: string
      enum: [default, success, warning, error, info]
---

## Quand utiliser
Pour un KPI enrichi avec delta, unite et variante de couleur.
`,
    renderer: renderStatCard,
  },

  // ── grid-data ────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: grid-data
description: Grille de donnees tabulaires avec highlights de cellules.
group: rich
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
      items:
        type: array
    highlights:
      type: array
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

## Quand utiliser
Pour des grilles de donnees avec mise en valeur de cellules (heatmap, comparaison).
`,
    renderer: renderGridData,
  },

  // ── gallery ──────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: gallery
description: Galerie d'images avec lightbox.
group: media
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

## Quand utiliser
Pour afficher une collection d'images.
`,
    renderer: renderGallery,
  },

  // ── carousel ─────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: carousel
description: Carousel de slides (images, contenu) avec navigation.
group: media
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

## Quand utiliser
Pour presenter du contenu en diaporama avec navigation.
`,
    renderer: renderCarousel,
  },

  // ── map ──────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: map
description: Carte avec marqueurs (affichage textuel en mode vanilla).
group: advanced
schema:
  type: object
  properties:
    title:
      type: string
    center:
      type: object
      properties:
        lat:
          type: number
        lng:
          type: number
    zoom:
      type: number
    height:
      type: string
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

## Quand utiliser
Pour afficher des donnees geolocalisees. Version vanilla: affichage textuel des marqueurs.
`,
    renderer: renderMap,
  },

  // ── d3 ───────────────────────────────────────────────────────────────────
  {
    recipe: `---
widget: d3
description: Visualisation D3 simplifiee (heatmap, radial, treemap, force) en CSS/HTML pur.
group: advanced
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

## Quand utiliser
Pour des visualisations avancees. Version vanilla: approximation CSS sans D3.
`,
    renderer: renderD3,
  },

  // ── js-sandbox ───────────────────────────────────────────────────────────
  {
    recipe: `---
widget: js-sandbox
description: Sandbox JavaScript dans un iframe securise.
group: advanced
schema:
  type: object
  required:
    - code
  properties:
    title:
      type: string
    code:
      type: string
    html:
      type: string
    css:
      type: string
    height:
      type: string
---

## Quand utiliser
Pour des visualisations custom ou prototypes interactifs en JS pur.
`,
    renderer: renderJsSandbox,
  },
];

// ---------------------------------------------------------------------------
// Server creation
// ---------------------------------------------------------------------------

const server = createWebMcpServer('autouivanilla', {
  description: 'Vanilla HTML/CSS/JS widget renderers (zero framework dependencies)',
});

for (const def of WIDGET_DEFS) {
  server.registerWidget(def.recipe, def.renderer);
}

export const autouivanilla = server;
