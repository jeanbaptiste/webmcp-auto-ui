/**
 * UI Tool definitions — the render_* tools exposed to the LLM
 * Maps to all 22 block types in @webmcp-auto-ui/ui
 */
import type { AnthropicTool, AgentCallbacks } from './types.js';

export const UI_TOOLS: AnthropicTool[] = [
  // ── Simple blocks (PJ) ─────────────────────────────────────────────────
  {
    name: 'render_stat',
    description: 'Afficher une statistique clé (KPI, compteur, total). Label + valeur + tendance optionnelle.',
    input_schema: { type: 'object', properties: {
      label: { type: 'string' }, value: { type: 'string' },
      trend: { type: 'string' }, trendDir: { type: 'string', enum: ['up','down','neutral'] },
    }, required: ['label','value'] },
  },
  {
    name: 'render_kv',
    description: 'Afficher des paires clé-valeur (propriétés, métadonnées, détails).',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      rows: { type: 'array', items: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 } },
    }, required: ['rows'] },
  },
  {
    name: 'render_list',
    description: 'Afficher une liste ordonnée d\'items.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      items: { type: 'array', items: { type: 'string' } },
    }, required: ['items'] },
  },
  {
    name: 'render_chart',
    description: 'Afficher un graphique à barres simples. Labels + valeurs numériques.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      bars: { type: 'array', items: { type: 'array', prefixItems: [{ type: 'string' }, { type: 'number' }] } },
    }, required: ['bars'] },
  },
  {
    name: 'render_alert',
    description: 'Afficher une alerte ou notification système.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' }, message: { type: 'string' },
      level: { type: 'string', enum: ['info','warn','error'] },
    }, required: ['title'] },
  },
  {
    name: 'render_code',
    description: 'Afficher un bloc de code avec coloration syntaxique.',
    input_schema: { type: 'object', properties: {
      lang: { type: 'string' }, content: { type: 'string' },
    }, required: ['content'] },
  },
  {
    name: 'render_text',
    description: 'Afficher un paragraphe de texte libre.',
    input_schema: { type: 'object', properties: {
      content: { type: 'string' },
    }, required: ['content'] },
  },
  {
    name: 'render_actions',
    description: 'Afficher une rangée de boutons d\'action.',
    input_schema: { type: 'object', properties: {
      buttons: { type: 'array', items: { type: 'object', properties: {
        label: { type: 'string' }, primary: { type: 'boolean' },
      }, required: ['label'] } },
    }, required: ['buttons'] },
  },
  {
    name: 'render_tags',
    description: 'Afficher un groupe de tags/badges.',
    input_schema: { type: 'object', properties: {
      label: { type: 'string' },
      tags: { type: 'array', items: { type: 'object', properties: {
        text: { type: 'string' }, active: { type: 'boolean' },
      }, required: ['text'] } },
    }, required: ['tags'] },
  },
  // ── Rich widgets (Archive) ─────────────────────────────────────────────
  {
    name: 'render_table',
    description: 'Afficher un tableau de données triable avec colonnes configurables.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      columns: { type: 'array', items: { type: 'object', properties: {
        key: { type: 'string' }, label: { type: 'string' },
        align: { type: 'string', enum: ['left','center','right'] },
      }, required: ['key','label'] } },
      rows: { type: 'array', items: { type: 'object' } },
    }, required: ['rows'] },
  },
  {
    name: 'render_timeline',
    description: 'Afficher une chronologie d\'événements avec statuts.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      events: { type: 'array', items: { type: 'object', properties: {
        date: { type: 'string' }, title: { type: 'string' },
        description: { type: 'string' }, status: { type: 'string', enum: ['done','active','pending'] },
      }, required: ['title'] } },
    }, required: ['events'] },
  },
  {
    name: 'render_profile',
    description: 'Afficher une fiche profil avec avatar, champs et statistiques.',
    input_schema: { type: 'object', properties: {
      name: { type: 'string' }, subtitle: { type: 'string' },
      fields: { type: 'array', items: { type: 'object', properties: {
        label: { type: 'string' }, value: { type: 'string' },
      }, required: ['label','value'] } },
      stats: { type: 'array', items: { type: 'object', properties: {
        label: { type: 'string' }, value: { type: 'string' },
      }, required: ['label','value'] } },
    }, required: ['name'] },
  },
  {
    name: 'render_trombinoscope',
    description: 'Afficher une grille de portraits (trombinoscope). Personnes avec nom, sous-titre, badge.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      people: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, subtitle: { type: 'string' },
        badge: { type: 'string' }, color: { type: 'string' },
      }, required: ['name'] } },
      columns: { type: 'number' },
    }, required: ['people'] },
  },
  {
    name: 'render_json',
    description: 'Afficher un arbre JSON interactif explorable.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' }, data: {},
      maxDepth: { type: 'number' }, expanded: { type: 'boolean' },
    }, required: ['data'] },
  },
  {
    name: 'render_hemicycle',
    description: 'Afficher un hémicycle SVG (composition parlementaire par groupe).',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      groups: { type: 'array', items: { type: 'object', properties: {
        id: { type: 'string' }, label: { type: 'string' },
        seats: { type: 'number' }, color: { type: 'string' },
      }, required: ['id','label','seats','color'] } },
      totalSeats: { type: 'number' },
    }, required: ['groups'] },
  },
  {
    name: 'render_chart_rich',
    description: 'Afficher un graphique riche (bar, line, area, pie, donut) avec plusieurs séries.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      type: { type: 'string', enum: ['bar','line','area','pie','donut'] },
      labels: { type: 'array', items: { type: 'string' } },
      data: { type: 'array', items: { type: 'object', properties: {
        label: { type: 'string' }, values: { type: 'array', items: { type: 'number' } }, color: { type: 'string' },
      }, required: ['values'] } },
    }, required: ['data'] },
  },
  {
    name: 'render_cards',
    description: 'Afficher une grille de cartes (résultats, dossiers, entités).',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      cards: { type: 'array', items: { type: 'object', properties: {
        title: { type: 'string' }, description: { type: 'string' },
        subtitle: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } },
      }, required: ['title'] } },
    }, required: ['cards'] },
  },
  {
    name: 'render_sankey',
    description: 'Afficher un diagramme de flux Sankey (votes, co-signatures, parcours).',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      nodes: { type: 'array', items: { type: 'object', properties: {
        id: { type: 'string' }, label: { type: 'string' }, color: { type: 'string' },
      }, required: ['id','label'] } },
      links: { type: 'array', items: { type: 'object', properties: {
        source: { type: 'string' }, target: { type: 'string' }, value: { type: 'number' },
      }, required: ['source','target','value'] } },
    }, required: ['nodes','links'] },
  },
  {
    name: 'render_log',
    description: 'Afficher un flux de logs avec niveau, timestamp et source.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      entries: { type: 'array', items: { type: 'object', properties: {
        timestamp: { type: 'string' }, level: { type: 'string', enum: ['debug','info','warn','error'] },
        message: { type: 'string' }, source: { type: 'string' },
      }, required: ['message'] } },
    }, required: ['entries'] },
  },
  // ── Gallery & Carousel ──────────────────────────────────────────────────
  {
    name: 'render_gallery',
    description: 'Afficher une galerie d\'images avec lightbox.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      images: { type: 'array', items: { type: 'object', properties: {
        src: { type: 'string' }, alt: { type: 'string' }, caption: { type: 'string' },
      }, required: ['src'] } },
      columns: { type: 'number' },
    }, required: ['images'] },
  },
  {
    name: 'render_carousel',
    description: 'Afficher un carousel de slides (images, contenu) avec navigation et auto-play.',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      slides: { type: 'array', items: { type: 'object', properties: {
        src: { type: 'string' }, title: { type: 'string' }, subtitle: { type: 'string' }, content: { type: 'string' },
      } } },
      autoPlay: { type: 'boolean' },
      interval: { type: 'number' },
    }, required: ['slides'] },
  },
  // ── Map (Leaflet) ──────────────────────────────────────────────────────
  {
    name: 'render_map',
    description: 'Afficher une carte Leaflet interactive avec marqueurs. Fond sombre CARTO.',
    input_schema: { type: 'object', properties: {
      title:   { type: 'string' },
      center:  { type: 'object', description: 'Centre de la carte', properties: { lat: { type: 'number' }, lng: { type: 'number' } }, required: ['lat', 'lng'] },
      zoom:    { type: 'number', description: 'Niveau de zoom (1-18)', default: 6 },
      height:  { type: 'string', description: 'Hauteur CSS de la carte (ex: "400px")', default: '400px' },
      markers: { type: 'array', items: { type: 'object', properties: {
        lat:   { type: 'number' },
        lng:   { type: 'number' },
        label: { type: 'string' },
        color: { type: 'string' },
      }, required: ['lat', 'lng'] } },
    } },
  },
  // ── Stat card (enriched KPI) ───────────────────────────────────────────
  {
    name: 'render_stat_card',
    description: 'KPI enrichi avec unité, delta et variante colorée (success/warning/error/info).',
    input_schema: { type: 'object', properties: {
      label:         { type: 'string' },
      value:         { type: 'string' },
      unit:          { type: 'string', description: 'Unité affichée après la valeur (ex: "%", "km")' },
      delta:         { type: 'string', description: 'Variation affichée (ex: "+12%")' },
      trend:         { type: 'string', enum: ['up', 'down', 'flat'] },
      previousValue: { type: 'string' },
      variant:       { type: 'string', enum: ['default', 'success', 'warning', 'error', 'info'] },
    }, required: ['label', 'value'] },
  },
  // ── Grid data ──────────────────────────────────────────────────────────
  {
    name: 'render_grid',
    description: 'Grille de données tabulaires avec highlights de cellules (heatmap, comparaison).',
    input_schema: { type: 'object', properties: {
      title:   { type: 'string' },
      columns: { type: 'array', items: { type: 'object', properties: {
        key:   { type: 'string' },
        label: { type: 'string' },
        width: { type: 'string' },
      }, required: ['key', 'label'] } },
      rows:    { type: 'array', description: 'Tableau de tableaux de valeurs (row-major)', items: { type: 'array' } },
      highlights: { type: 'array', description: 'Cellules à coloriser', items: { type: 'object', properties: {
        row:   { type: 'number' },
        col:   { type: 'number' },
        color: { type: 'string' },
      }, required: ['row', 'col'] } },
    }, required: ['rows'] },
  },
  // ── D3 visualization ───────────────────────────────────────────────────
  {
    name: 'render_d3',
    description: 'Render a D3.js visualization (hex-heatmap, radial, treemap, force graph).',
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      preset: { type: 'string', enum: ['hex-heatmap', 'radial', 'treemap', 'force'] },
      data: { type: 'object' },
      config: { type: 'object' },
    }, required: ['preset', 'data'] },
  },
  // ── JS Sandbox ─────────────────────────────────────────────────────────
  {
    name: 'render_js_sandbox',
    description: 'Exécuter du code JavaScript arbitraire dans un iframe sandboxé (allow-scripts). Peut manipuler un <div id="root"> et utiliser fetch. Idéal pour des visualisations custom, animations, ou prototypes interactifs.',
    input_schema: { type: 'object', properties: {
      title:  { type: 'string', description: 'Titre affiché en haut du bloc' },
      code:   { type: 'string', description: 'Code JavaScript à exécuter (accès à window, document, fetch)' },
      html:   { type: 'string', description: 'HTML initial injecté dans <div id="root"> avant exécution du code' },
      css:    { type: 'string', description: 'CSS injecté dans le <head> de l\'iframe' },
      height: { type: 'string', description: 'Hauteur CSS de l\'iframe (ex: "400px", "50vh")', default: '300px' },
    }, required: ['code'] },
  },
  // ── Canvas actions ──────────────────────────────────────────────────────
  {
    name: 'clear_canvas',
    description: 'Effacer tous les blocs du canvas pour repartir de zéro.',
    input_schema: { type: 'object', properties: {} },
  },
  // ── Block mutation ──────────────────────────────────────────────────────
  {
    name: 'update_block',
    description: 'Mettre à jour les données d\'un bloc existant sur le canvas (modifier son contenu).',
    input_schema: { type: 'object', properties: {
      id:   { type: 'string', description: 'ID du bloc retourné lors de sa création.' },
      data: { type: 'object', description: 'Nouvelles données à fusionner avec les données existantes.' },
    }, required: ['id', 'data'] },
  },
  {
    name: 'move_block',
    description: 'Déplacer un bloc vers une nouvelle position en pixels sur le canvas.',
    input_schema: { type: 'object', properties: {
      id: { type: 'string' },
      x:  { type: 'number', description: 'Position horizontale en pixels depuis le bord gauche.' },
      y:  { type: 'number', description: 'Position verticale en pixels depuis le bord supérieur.' },
    }, required: ['id', 'x', 'y'] },
  },
  {
    name: 'resize_block',
    description: 'Redimensionner un bloc existant sur le canvas.',
    input_schema: { type: 'object', properties: {
      id:     { type: 'string' },
      width:  { type: 'number', description: 'Largeur en pixels (min 120).' },
      height: { type: 'number', description: 'Hauteur en pixels (min 80).' },
    }, required: ['id', 'width', 'height'] },
  },
  {
    name: 'style_block',
    description: 'Modifier le style visuel d\'un bloc (couleur d\'accent, fond, texte). Utilise les tokens CSS du thème.',
    input_schema: { type: 'object', properties: {
      id:     { type: 'string' },
      styles: {
        type: 'object',
        description: 'Tokens CSS à surcharger (sans le préfixe "--color-"). Clés valides : accent, accent2, bg, surface, surface2, text1, text2, border, teal, amber.',
        additionalProperties: { type: 'string' },
      },
    }, required: ['id', 'styles'] },
  },
];

// Map render_* name → block type for BlockRenderer
export const TOOL_TO_BLOCK: Record<string, string> = {
  render_stat: 'stat',
  render_kv: 'kv',
  render_list: 'list',
  render_chart: 'chart',
  render_alert: 'alert',
  render_code: 'code',
  render_text: 'text',
  render_actions: 'actions',
  render_tags: 'tags',
  render_table: 'data-table',
  render_timeline: 'timeline',
  render_profile: 'profile',
  render_trombinoscope: 'trombinoscope',
  render_json: 'json-viewer',
  render_hemicycle: 'hemicycle',
  render_chart_rich: 'chart-rich',
  render_cards: 'cards',
  render_sankey: 'sankey',
  render_log: 'log',
  render_gallery: 'gallery',
  render_carousel: 'carousel',
  render_d3: 'd3',
  render_map: 'map',
  render_stat_card: 'stat-card',
  render_grid: 'grid-data',
  render_js_sandbox: 'js-sandbox',
};

const MUTATION_TOOLS = new Set(['clear_canvas', 'update_block', 'move_block', 'resize_block', 'style_block']);

export function isUITool(name: string): boolean {
  return name in TOOL_TO_BLOCK || MUTATION_TOOLS.has(name);
}

export function executeUITool(
  name: string,
  args: Record<string, unknown>,
  callbacks: AgentCallbacks
): string {
  if (name === 'clear_canvas') {
    callbacks.onClear?.();
    return 'Canvas cleared.';
  }
  if (name === 'update_block') {
    callbacks.onUpdate?.(args.id as string, args.data as Record<string, unknown>);
    return `Block ${args.id} updated.`;
  }
  if (name === 'move_block') {
    callbacks.onMove?.(args.id as string, args.x as number, args.y as number);
    return `Block ${args.id} moved to (${args.x}, ${args.y}).`;
  }
  if (name === 'resize_block') {
    callbacks.onResize?.(args.id as string, args.width as number, args.height as number);
    return `Block ${args.id} resized to ${args.width}×${args.height}.`;
  }
  if (name === 'style_block') {
    callbacks.onStyle?.(args.id as string, args.styles as Record<string, string>);
    return `Block ${args.id} styled.`;
  }
  const blockType = TOOL_TO_BLOCK[name];
  if (!blockType) return `Unknown UI tool: ${name}`;
  const result = callbacks.onBlock?.(blockType, args);
  const id = result?.id;
  return id ? `Rendered ${blockType} block (id: ${id}).` : `Rendered ${blockType} block.`;
}
