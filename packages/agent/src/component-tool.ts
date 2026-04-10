/**
 * Unified `component` tool — discovery + render via a single tool.
 *
 * Coexists with the individual render_* tools; both are valid.
 *
 * Usage (from the LLM side):
 *   component("help")                     → list all components
 *   component("help", "stat-card")        → schema of stat-card
 *   component("stat-card", { label: … })  → render stat-card
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

// ── Tool definition ──────────────────────────────────────────────────────────

// Build a rich description listing all renderable components
function buildComponentDescription(): string {
  const seen = new Set<ComponentEntry>();
  const renderable: string[] = [];
  const canvas: string[] = [];

  for (const entry of componentRegistry.values()) {
    if (seen.has(entry) || !entry.renderable) continue;
    seen.add(entry);
    // Canvas actions
    if (['clear', 'update', 'move', 'resize', 'style'].includes(entry.name)) {
      canvas.push(entry.name);
    } else {
      // Short description: first sentence, truncated at last word boundary
      let desc = entry.description.split('.')[0];
      if (desc.length > 60) {
        desc = desc.slice(0, 60);
        const lastSpace = desc.lastIndexOf(' ');
        if (lastSpace > 20) desc = desc.slice(0, lastSpace);
      }
      renderable.push(`${entry.name}: ${desc}`);
    }
  }

  return `Outil UI unifié — rend des composants visuels.
Composants : ${renderable.join(' | ')}
Canvas : ${canvas.join(', ')}
→ component("help", "nom") pour le schéma détaillé
→ component("nom", {params}) pour rendre`;
}

export const COMPONENT_TOOL: AnthropicTool = {
  name: 'component',
  description: buildComponentDescription(),
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "Nom du composant (ex: 'stat', 'chart', 'table') ou 'help'.",
      },
      params: {
        description:
          "Paramètres du composant (objet) pour le rendu, ou nom du composant (string) pour obtenir l'aide d'un composant spécifique.",
      },
    },
    required: ['name'],
  },
};

// ── Execution ────────────────────────────────────────────────────────────────

export function executeComponent(
  args: { name: string; params?: unknown },
  callbacks: AgentCallbacks,
): string {
  // ── Help mode ────────────────────────────────────────────────────────────
  if (args.name === 'help') {
    if (typeof args.params === 'string') {
      return helpForComponent(args.params);
    }
    return helpAll();
  }

  // ── Render mode (composant prioritaire sur recette en cas de collision) ──
  const comp = componentRegistry.get(args.name);
  if (comp) {
    return executeUITool(
      comp.toolName,
      (args.params as Record<string, unknown>) ?? {},
      callbacks,
    );
  }

  // ── Recipe mode — component("recipe-id") ────────────────────────────────
  const recipe = recipeRegistry.get(args.name);
  if (recipe) {
    return JSON.stringify({
      recipe: recipe.name,
      description: recipe.body,
      components_used: recipe.components_used,
      layout: recipe.layout,
      hint: 'Utilise les composants listés pour composer cette vue.',
    });
  }

  return JSON.stringify({ error: `Composant inconnu : ${args.name}. Appelle component("help") pour la liste.` });
}

// ── Help helpers ──────────────────────────────────────────────────────────────

function helpAll(): string {
  // Composants renderable
  const seen = new Set<ComponentEntry>();
  const components: { name: string; description: string }[] = [];
  for (const entry of componentRegistry.values()) {
    if (seen.has(entry) || !entry.renderable) continue;
    seen.add(entry);
    components.push({ name: entry.name, description: entry.description.split('.')[0] });
  }

  // Recettes WebMCP
  const recipes = recipeRegistry.getAll().map(r => ({
    name: r.id,
    when: r.when,
    components: r.components_used,
  }));

  return JSON.stringify({
    components,
    recipes: recipes.length > 0 ? recipes : undefined,
    hint: 'component("help", "nom") pour le schéma détaillé. component("nom", {params}) pour rendre.',
  });
}

function helpForComponent(name: string): string {
  // Check component
  const comp = componentRegistry.get(name);
  if (comp) {
    // Find recipes that use this component
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

  return JSON.stringify({ error: `Inconnu : ${name}. Appelle component("help") pour la liste.` });
}
