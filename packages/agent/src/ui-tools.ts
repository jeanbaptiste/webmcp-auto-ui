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
  // ── Canvas actions ──────────────────────────────────────────────────────
  {
    name: 'clear_canvas',
    description: 'Effacer tous les blocs du canvas pour repartir de zéro.',
    input_schema: { type: 'object', properties: {} },
  },
];

// Map render_* name → block type for BlockRenderer
const TOOL_TO_BLOCK: Record<string, string> = {
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
};

export function isUITool(name: string): boolean {
  return name in TOOL_TO_BLOCK || name === 'clear_canvas';
}

export function executeUITool(
  name: string,
  args: Record<string, unknown>,
  callbacks: AgentCallbacks
): string {
  if (name === 'clear_canvas') {
    callbacks.onClear?.();
    return 'Canvas cleared';
  }
  const blockType = TOOL_TO_BLOCK[name];
  if (!blockType) return `Unknown UI tool: ${name}`;
  callbacks.onBlock?.(blockType, args);
  return `Rendered ${blockType} block`;
}
