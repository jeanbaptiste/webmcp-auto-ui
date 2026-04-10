/**
 * Three separate tools for component discovery and rendering:
 *
 *   list_components()                     → list all components + recipes
 *   get_component("stat-card")            → detailed JSON schema
 *   component("stat-card", { label: … })  → render stat-card
 *
 * Coexists with the individual render_* tools; both are valid.
 *
 * Inspired by a suggestion from Emmanuel Raviart, creator of Tricoteuses MCP server
 * (https://www.tricoteuses.fr/mcp)
 */

import { UI_TOOLS, executeUITool } from './ui-tools.js';
import type { AnthropicTool, AgentCallbacks } from './types.js';
import { recipeRegistry } from './recipe-registry.js';

// ── Registry ─────────────────────────────────────────────────────────────────

export interface ComponentEntry {
  /** Short name without render_ prefix (e.g. "stat-card") */
  name: string;
  /** Original tool name (e.g. "render_stat_card") */
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** true if the component can be rendered via executeUITool (render_* tools + canvas actions) */
  renderable: boolean;
}

/** Map<shortName, ComponentEntry> — mutable so apps can register custom components */
export const componentRegistry = new Map<string, ComponentEntry>();

// Populate from UI_TOOLS
for (const tool of UI_TOOLS) {
  let shortName: string;

  if (tool.name.startsWith('render_')) {
    // render_stat_card → stat-card
    shortName = tool.name.slice('render_'.length).replace(/_/g, '-');
  } else if (tool.name === 'clear_canvas') {
    shortName = 'clear';
  } else if (tool.name === 'update_block') {
    shortName = 'update';
  } else if (tool.name === 'move_block') {
    shortName = 'move';
  } else if (tool.name === 'resize_block') {
    shortName = 'resize';
  } else if (tool.name === 'style_block') {
    shortName = 'style';
  } else {
    shortName = tool.name;
  }

  const entry: ComponentEntry = {
    name: shortName,
    toolName: tool.name,
    description: tool.description,
    inputSchema: tool.input_schema,
    renderable: true,
  };

  componentRegistry.set(shortName, entry);
  // Also register with the original tool name for back-compat
  if (shortName !== tool.name) {
    componentRegistry.set(tool.name, entry);
  }
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const LIST_COMPONENTS_TOOL: AnthropicTool = {
  name: 'list_components',
  description: 'Liste tous les composants UI disponibles et les recettes WebMCP.',
  input_schema: {
    type: 'object',
    properties: {},
  },
};

export const GET_COMPONENT_TOOL: AnthropicTool = {
  name: 'get_component',
  description: "Retourne le schéma JSON détaillé d'un composant ou d'une recette. Appelle list_components d'abord pour voir les noms disponibles.",
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "Nom du composant (ex: 'stat-card', 'table', 'chart') ou d'une recette.",
      },
    },
    required: ['name'],
  },
};

export const COMPONENT_TOOL: AnthropicTool = {
  name: 'component',
  description: "Rend un composant UI. Appelle get_component(nom) d'abord pour connaître les paramètres attendus.",
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "Nom du composant (ex: 'stat-card', 'table', 'chart').",
      },
      params: {
        type: 'object',
        description: "Paramètres du composant (selon le schéma retourné par get_component).",
      },
    },
    required: ['name'],
  },
};

// ── Execution — list_components ───────────────────────────────────────────────

export function executeListComponents(): string {
  const seen = new Set<ComponentEntry>();
  const components: { name: string; description: string }[] = [];
  for (const entry of componentRegistry.values()) {
    if (seen.has(entry) || !entry.renderable) continue;
    seen.add(entry);
    components.push({ name: entry.name, description: entry.description.split('.')[0] });
  }

  const recipes = recipeRegistry.getAll().map(r => ({
    name: r.id,
    when: r.when,
    components: r.components_used,
  }));

  return JSON.stringify({
    components,
    recipes: recipes.length > 0 ? recipes : undefined,
    hint: 'get_component(nom) pour le schéma détaillé. component(nom, {params}) pour rendre.',
  });
}

// ── Execution — get_component ────────────────────────────────────────────────

export function executeGetComponent(name: string): string {
  // Check component
  const comp = componentRegistry.get(name);
  if (comp) {
    const relatedRecipes = recipeRegistry.getAll().filter(r =>
      r.components_used?.includes(comp.name)
    );
    return JSON.stringify({
      name: comp.name,
      description: comp.description,
      renderable: comp.renderable,
      schema: comp.inputSchema,
      recipes: relatedRecipes.length > 0
        ? relatedRecipes.map(r => ({ id: r.id, when: r.when, body: r.body }))
        : undefined,
    });
  }

  // Check recipe
  const recipe = recipeRegistry.get(name);
  if (recipe) {
    return JSON.stringify({
      recipe: recipe.name,
      when: recipe.when,
      components_used: recipe.components_used,
      layout: recipe.layout,
      body: recipe.body,
    });
  }

  return JSON.stringify({ error: `Inconnu : ${name}. Appelle list_components() pour la liste.` });
}

// ── Parameter coercion ──────────────────────────────────────────────────────
// LLMs (especially Haiku and Gemma) often send data in non-standard formats.
// Coerce common mismatches BEFORE passing to executeUITool.

type CoercionFn = (params: Record<string, unknown>) => Record<string, unknown>;
const customCoercions = new Map<string, CoercionFn>();

/**
 * Register a custom coercion function for a component.
 * Called before built-in coercions — if the custom fn returns a value, built-ins are skipped.
 */
export function registerCoercion(componentName: string, fn: CoercionFn): void {
  customCoercions.set(componentName, fn);
}

function coerceParams(name: string, params: Record<string, unknown>): Record<string, unknown> {
  // Custom coercion takes priority
  const custom = customCoercions.get(name);
  if (custom) return custom(params);
  // Table / data-table: normalize columns and rows for DataTable component
  // DataTable expects: columns: {key,label}[], rows: Record<string,unknown>[]
  if (name === 'table' || name === 'data-table' || name === 'render_table') {
    let cols = params.columns as unknown[] | undefined;
    let rowData = (params.rows ?? params.data) as unknown[] | undefined;

    if (Array.isArray(rowData) && rowData.length > 0) {
      // columns: string[] → {key, label}[]
      if (Array.isArray(cols) && cols.length > 0 && typeof cols[0] === 'string') {
        const colNames = cols as string[];
        const normalizedCols = colNames.map(c => ({ key: c, label: c }));

        // rows: string[][] → Record<string,unknown>[] (zip with column names)
        if (Array.isArray(rowData[0])) {
          const normalizedRows = (rowData as unknown[][]).map(row =>
            Object.fromEntries(colNames.map((c, i) => [c, row[i] ?? '']))
          );
          const { data: _d, columns: _c, rows: _r, ...rest } = params;
          return { ...rest, columns: normalizedCols, rows: normalizedRows };
        }

        // rows: Record<string,unknown>[] — already objects, just fix columns
        if (typeof rowData[0] === 'object' && !Array.isArray(rowData[0])) {
          const { data: _d, columns: _c, ...rest } = params;
          return { ...rest, columns: normalizedCols, rows: rowData };
        }
      }

      // No columns provided: {data: [{key: val}]} → {rows: [{key: val}]}
      if (!params.rows && Array.isArray(params.data) && typeof rowData[0] === 'object' && !Array.isArray(rowData[0])) {
        const { data, ...rest } = params;
        return { ...rest, rows: data };
      }
    }
  }

  // Stat-card: {stats: [{label, value}]} → {label, value} (first element)
  if (name === 'stat-card' && Array.isArray(params.stats) && params.stats.length > 0 && !params.label) {
    const first = params.stats[0] as Record<string, unknown>;
    const { stats, ...rest } = params;
    return { ...rest, ...first };
  }

  // KV: {items: [{key, value}]} → {rows: [[key, val]]}
  if (name === 'kv' && Array.isArray(params.items) && !params.rows) {
    const rows = (params.items as Record<string, unknown>[]).map(item => {
      const k = String(item.key ?? item.label ?? item.name ?? '');
      const v = String(item.value ?? item.description ?? '');
      return [k, v];
    });
    const { items, ...rest } = params;
    return { ...rest, rows };
  }

  // KV: {data: {key: val}} → {rows: [[key, val]]}
  if (name === 'kv' && params.data && typeof params.data === 'object' && !Array.isArray(params.data) && !params.rows) {
    const rows = Object.entries(params.data as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]);
    const { data, ...rest } = params;
    return { ...rest, rows };
  }

  // KV: {data: [[key, val]]} → {rows: [[key, val]]}
  if (name === 'kv' && Array.isArray(params.data) && !params.rows) {
    const { data, ...rest } = params;
    return { ...rest, rows: data };
  }

  // Chart: {items: [{label, value}]} → {bars: [[label, value]]}
  if (name === 'chart' && Array.isArray(params.items) && params.items.length > 0 && typeof params.items[0] === 'object' && !params.bars && !params.data) {
    const bars = (params.items as Record<string, unknown>[]).map(d => {
      const label = String(d.label ?? d.name ?? d.key ?? '');
      const value = Number(d.value ?? d.count ?? 0);
      return [label, value];
    });
    const { items, ...rest } = params;
    return { ...rest, bars };
  }

  // Chart: {data: [{label, value}]} → {bars: [[label, value]]}
  if (name === 'chart' && Array.isArray(params.data) && params.data.length > 0 && typeof params.data[0] === 'object' && !params.bars) {
    const bars = (params.data as Record<string, unknown>[]).map(d => {
      const label = String(d.label ?? d.name ?? '');
      const value = Number(d.value ?? d.count ?? 0);
      return [label, value];
    });
    const { data, ...rest } = params;
    return { ...rest, bars };
  }

  return params;
}

// ── Execution — component (render only) ──────────────────────────────────────

export function executeComponent(
  args: { name: string; params?: unknown },
  callbacks: AgentCallbacks,
): string {
  const comp = componentRegistry.get(args.name);
  if (comp) {
    const rawParams = (args.params as Record<string, unknown>) ?? {};
    const coerced = coerceParams(comp.name, rawParams);
    return executeUITool(
      comp.toolName,
      coerced,
      callbacks,
    );
  }

  return JSON.stringify({ error: `Composant inconnu : ${args.name}. Appelle list_components() pour la liste.` });
}
