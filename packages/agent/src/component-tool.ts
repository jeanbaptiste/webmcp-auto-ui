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

// ── Execution — component (render only) ──────────────────────────────────────

export function executeComponent(
  args: { name: string; params?: unknown },
  callbacks: AgentCallbacks,
): string {
  const comp = componentRegistry.get(args.name);
  if (comp) {
    return executeUITool(
      comp.toolName,
      (args.params as Record<string, unknown>) ?? {},
      callbacks,
    );
  }

  return JSON.stringify({ error: `Composant inconnu : ${args.name}. Appelle list_components() pour la liste.` });
}
