// ---------------------------------------------------------------------------
// AutoUI WebMCP Server — built-in UI widgets + canvas/recall tools
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// ---------------------------------------------------------------------------
// Inline recipes (frontmatter + body)
// ---------------------------------------------------------------------------

const RECIPES: string[] = [
  // ── stat ────────────────────────────────────────────────────────────────
  `---
widget: stat
description: Statistique cle (KPI, compteur, total). Label + valeur + tendance optionnelle.
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

## Comment
Appeler widget_display({name: "stat", params: {label: "Total", value: "42"}}).
`,

  // ── kv ──────────────────────────────────────────────────────────────────
  `---
widget: kv
description: Paires cle-valeur (proprietes, metadonnees, details).
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

## Comment
Appeler widget_display({name: "kv", params: {rows: [["Nom", "Dupont"], ["Age", "42"]]}}).
`,

  // ── list ─────────────────────────────────────────────────────────────────
  `---
widget: list
description: Liste ordonnee d'items.
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

## Comment
Appeler widget_display({name: "list", params: {items: ["A", "B", "C"]}}).
`,

  // ── chart ────────────────────────────────────────────────────────────────
  `---
widget: chart
description: Graphique a barres simples. Labels + valeurs numeriques.
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

## Comment
Appeler widget_display({name: "chart", params: {bars: [["Jan", 10], ["Fev", 20]]}}).
`,

  // ── alert ────────────────────────────────────────────────────────────────
  `---
widget: alert
description: Alerte ou notification systeme.
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

## Comment
Appeler widget_display({name: "alert", params: {title: "Attention", message: "Disque plein", level: "warn"}}).
`,

  // ── code ─────────────────────────────────────────────────────────────────
  `---
widget: code
description: Bloc de code avec coloration syntaxique.
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
Pour afficher un extrait de code source avec coloration syntaxique.

## Comment
Appeler widget_display({name: "code", params: {lang: "python", content: "print('hello')"}}).
`,

  // ── text ─────────────────────────────────────────────────────────────────
  `---
widget: text
description: Paragraphe de texte libre.
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

## Comment
Appeler widget_display({name: "text", params: {content: "Texte explicatif..."}}).
`,

  // ── actions ──────────────────────────────────────────────────────────────
  `---
widget: actions
description: Rangee de boutons d'action.
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

## Comment
Appeler widget_display({name: "actions", params: {buttons: [{label: "OK", primary: true}, {label: "Annuler"}]}}).
`,

  // ── tags ─────────────────────────────────────────────────────────────────
  `---
widget: tags
description: Groupe de tags/badges.
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

## Comment
Appeler widget_display({name: "tags", params: {tags: [{text: "JS", active: true}, {text: "TS"}]}}).
`,

  // ── data-table ───────────────────────────────────────────────────────────
  `---
widget: data-table
description: Tableau de donnees triable avec colonnes configurables.
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

## Comment
Appeler widget_display({name: "data-table", params: {columns: [{key:"name",label:"Nom"}], rows: [{name:"Alice"}]}}).
`,

  // ── timeline ─────────────────────────────────────────────────────────────
  `---
widget: timeline
description: Chronologie d'evenements avec statuts.
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

## Comment
Appeler widget_display({name: "timeline", params: {events: [{title: "Debut", date: "2024-01", status: "done"}]}}).
`,

  // ── profile ──────────────────────────────────────────────────────────────
  `---
widget: profile
description: Fiche profil avec avatar, champs et statistiques.
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

## Comment
Appeler widget_display({name: "profile", params: {name: "Alice", fields: [{label:"Role", value:"Dev"}]}}).

## Erreurs courantes
- Ne JAMAIS inventer d'URLs pour l'avatar — utiliser uniquement celles retournées par les outils MCP. Sans URL, le widget affiche les initiales automatiquement.
`,

  // ── trombinoscope ────────────────────────────────────────────────────────
  `---
widget: trombinoscope
description: Grille de portraits (trombinoscope). Personnes avec nom, sous-titre, badge.
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

## Comment
Appeler widget_display({name: "trombinoscope", params: {people: [{name: "Alice", badge: "Lead"}]}}).

## Erreurs courantes
- Ne JAMAIS inventer d'URLs pour le champ avatar — utiliser uniquement celles retournées par les outils MCP. Sans URL, le widget affiche les initiales automatiquement.
`,

  // ── json-viewer ──────────────────────────────────────────────────────────
  `---
widget: json-viewer
description: Arbre JSON interactif explorable.
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

## Comment
Appeler widget_display({name: "json-viewer", params: {data: {a: 1, b: {c: 2}}}}).
`,

  // ── hemicycle ────────────────────────────────────────────────────────────
  `---
widget: hemicycle
description: Hemicycle SVG (composition parlementaire par groupe).
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

## Comment
Appeler widget_display({name: "hemicycle", params: {groups: [{id:"g1", label:"Parti A", seats:120, color:"#e63946"}]}}).
`,

  // ── chart-rich ───────────────────────────────────────────────────────────
  `---
widget: chart-rich
description: Graphique riche (bar, line, area, pie, donut) avec plusieurs series.
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

## Comment
Appeler widget_display({name: "chart-rich", params: {type: "bar", labels: ["Q1","Q2"], data: [{label:"Ventes", values:[10,20]}]}}).
`,

  // ── cards ────────────────────────────────────────────────────────────────
  `---
widget: cards
description: Grille de cartes (resultats, dossiers, entites).
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

## Comment
Appeler widget_display({name: "cards", params: {cards: [{title: "Projet A", description: "En cours"}]}}).

## Erreurs courantes
- Ne JAMAIS inventer d'URLs d'images pour le champ image — utiliser uniquement celles retournées par les outils MCP. Si aucune URL n'est disponible, ne pas inclure de champ image.
`,

  // ── sankey ───────────────────────────────────────────────────────────────
  `---
widget: sankey
description: Diagramme de flux Sankey (votes, co-signatures, parcours).
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

## Comment
Appeler widget_display({name: "sankey", params: {nodes: [{id:"a", label:"A"}], links: [{source:"a", target:"b", value:10}]}}).
`,

  // ── log ──────────────────────────────────────────────────────────────────
  `---
widget: log
description: Flux de logs avec niveau, timestamp et source.
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

## Comment
Appeler widget_display({name: "log", params: {entries: [{message: "Started", level: "info", timestamp: "12:00"}]}}).
`,

  // ── gallery ──────────────────────────────────────────────────────────────
  `---
widget: gallery
description: Galerie d'images avec lightbox.
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
Pour afficher une collection d'images avec navigation lightbox.

## Comment
Appeler widget_display({name: "gallery", params: {images: [{src: "https://...", alt: "Photo 1"}]}}).

## Erreurs courantes
- Ne JAMAIS fabriquer d'URLs d'images — utiliser uniquement celles retournées par les outils MCP
- Toujours fournir un alt pour l'accessibilité
`,

  // ── carousel ─────────────────────────────────────────────────────────────
  `---
widget: carousel
description: Carousel de slides (images, contenu) avec navigation et auto-play.
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

## Comment
Appeler widget_display({name: "carousel", params: {slides: [{src: "https://...", title: "Slide 1"}]}}).

## Erreurs courantes
- Ne JAMAIS fabriquer d'URLs d'images pour src — utiliser uniquement celles retournées par les outils MCP
`,

  // ── map ──────────────────────────────────────────────────────────────────
  `---
widget: map
description: Carte Leaflet interactive avec marqueurs. Fond sombre CARTO.
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

## Quand utiliser
Pour afficher une carte geographique avec des marqueurs.

## Comment
Appeler widget_display({name: "map", params: {center: {lat: 48.8, lng: 2.3}, zoom: 12, markers: [{lat: 48.8, lng: 2.3, label: "Paris"}]}}).
`,

  // ── stat-card ────────────────────────────────────────────────────────────
  `---
widget: stat-card
description: KPI enrichi avec unite, delta et variante coloree (success/warning/error/info).
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

## Quand utiliser
Pour un KPI enrichi avec delta, unite et variante de couleur.

## Comment
Appeler widget_display({name: "stat-card", params: {label: "Uptime", value: "99.9", unit: "%", trend: "up", variant: "success"}}).
`,

  // ── grid-data ────────────────────────────────────────────────────────────
  `---
widget: grid-data
description: Grille de donnees tabulaires avec highlights de cellules (heatmap, comparaison).
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

## Quand utiliser
Pour des grilles de donnees avec mise en valeur de cellules (heatmap, comparaison).

## Comment
Appeler widget_display({name: "grid-data", params: {columns: [{key:"a",label:"A"}], rows: [[1,2],[3,4]], highlights: [{row:0,col:1,color:"#ff0"}]}}).
`,

  // ── d3 ───────────────────────────────────────────────────────────────────
  `---
widget: d3
description: Visualisation D3.js (hex-heatmap, radial, treemap, force graph).
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
Pour des visualisations avancees D3.js (heatmap hexagonale, radial, treemap, graphe de force).

## Comment
Appeler widget_display({name: "d3", params: {preset: "treemap", data: {name: "root", children: [...]}}}).
`,

  // ── js-sandbox ───────────────────────────────────────────────────────────
  `---
widget: js-sandbox
description: Sandbox JavaScript dans un iframe securise. Code arbitraire avec acces a DOM et fetch.
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

## Quand utiliser
Pour des visualisations custom, animations, ou prototypes interactifs en JS pur.

## Comment
Appeler widget_display({name: "js-sandbox", params: {code: "document.getElementById('root').innerHTML = '<h1>Hello</h1>'"}}).
`,

  // ── recipe-browser ──────────────────────────────────────────────────────
  `---
widget: recipe-browser
description: Affiche les recettes disponibles sous forme de cartes interactives et permet de consulter le detail de chaque recette.
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

## Quand utiliser
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

## Erreurs courantes
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

// ---------------------------------------------------------------------------
// Custom tool: canvas
// ---------------------------------------------------------------------------

autoui.addTool({
  name: 'canvas',
  description: 'Manipulate widgets on the canvas. Actions: clear, update, move, resize, style.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['clear', 'update', 'move', 'resize', 'style'] },
      id: { type: 'string', description: 'Widget ID (not needed for clear)' },
      params: { type: 'object', description: 'Action parameters: move={x,y}, resize={width,height}, style={styles}, update={data}' },
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
  description: "Re-read the full result of a previous tool call. Use the identifier returned in the summary (e.g. recall('toolu_xxx')).",
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: "Tool call ID (e.g. 'toolu_xxx')" },
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
