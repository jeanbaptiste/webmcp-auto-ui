/**
 * Component discovery and rendering tools:
 *
 *   list_components()                     → list all available components + recipes
 *   get_component("stat-card")            → detailed JSON schema for a component
 *   component("stat-card", { label: … })  → render a component by name
 *
 * These tools complement the individual render_* tools.
 * The LLM can use either render_stat({...}) directly or component("stat", {...}).
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
  description: 'List all available UI components and WebMCP recipes.',
  input_schema: {
    type: 'object',
    properties: {},
  },
};

export const GET_COMPONENT_TOOL: AnthropicTool = {
  name: 'get_component',
  description: "Return the detailed JSON schema of a component or recipe. Component names are listed in the component() tool description.",
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "Component name (e.g. 'stat-card', 'table', 'chart') or recipe name.",
      },
    },
    required: ['name'],
  },
};

function getComponentNames(): string {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const entry of componentRegistry.values()) {
    if (!entry.renderable || seen.has(entry.name)) continue;
    seen.add(entry.name);
    names.push(entry.name);
  }
  return names.join(', ');
}

export const COMPONENT_TOOL: AnthropicTool = {
  name: 'component',
  description: `Render a UI component. Available: ${getComponentNames()}. Call get_component(name) for the expected parameters.`,
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "Component name (e.g. 'stat', 'chart', 'data-table', 'kv').",
      },
      params: {
        type: 'object',
        description: "Component parameters. Call get_component(name) for the schema if unsure.",
      },
    },
    required: ['name'],
  },
};

// ── Execution — list_components ───────────────────────────────────────────────

export function executeListComponents(): string {
  const seen = new Set<string>();
  const components: { name: string; description: string }[] = [];
  for (const entry of componentRegistry.values()) {
    if (seen.has(entry.name) || !entry.renderable) continue;
    seen.add(entry.name);
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

// ── Schema validation (Option C) ────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * Validate params against a component's JSON schema.
 * Checks required fields, unknown keys, and basic type mismatches.
 * Does NOT recurse deeply or validate enums/formats.
 */
export function validateParams(
  params: Record<string, unknown>,
  schema: Record<string, unknown>,
): ValidationResult {
  const issues: string[] = [];
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required ?? []) as string[];
  const schemaKeys = new Set(Object.keys(properties));
  const paramKeys = new Set(Object.keys(params));

  // 1. Required fields
  const missingRequired: string[] = [];
  for (const key of required) {
    if (!(key in params) || params[key] === undefined) {
      missingRequired.push(key);
    }
  }

  // 2. Unknown keys — detect probable field name mismatches
  const unknownKeys: string[] = [];
  for (const key of paramKeys) {
    if (!schemaKeys.has(key)) {
      unknownKeys.push(key);
    }
  }

  // Cross-reference unknown keys with missing required fields for hints
  if (missingRequired.length > 0 && unknownKeys.length > 0) {
    for (const missing of missingRequired) {
      for (const unknown of unknownKeys) {
        issues.push(
          `Missing required field "${missing}" — you passed "${unknown}" instead. Rename "${unknown}" to "${missing}".`,
        );
      }
    }
  } else {
    for (const key of missingRequired) {
      issues.push(`Missing required field "${key}".`);
    }
    for (const key of unknownKeys) {
      issues.push(`Unknown field "${key}" — not in schema. Valid fields: ${[...schemaKeys].join(', ')}.`);
    }
  }

  // 3. Basic type checks for known fields
  for (const key of paramKeys) {
    if (!schemaKeys.has(key)) continue;
    const value = params[key];
    if (value === undefined || value === null) continue;
    const propSchema = properties[key];
    const expectedType = propSchema?.type as string | undefined;
    if (!expectedType) continue;

    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (expectedType === 'array' && actualType !== 'array') {
      issues.push(`Field "${key}" should be an array, got ${actualType}.`);
    } else if (expectedType === 'string' && actualType !== 'string') {
      issues.push(`Field "${key}" should be a string, got ${actualType}.`);
    } else if (expectedType === 'number' && actualType !== 'number') {
      issues.push(`Field "${key}" should be a number, got ${actualType}.`);
    } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
      issues.push(`Field "${key}" should be an object, got ${actualType}.`);
    }
  }

  // 4. Array items structure — check first element matches expected shape
  for (const key of paramKeys) {
    if (!schemaKeys.has(key)) continue;
    const value = params[key];
    if (!Array.isArray(value) || value.length === 0) continue;
    const propSchema = properties[key];
    if (propSchema?.type !== 'array') continue;
    const itemsSchema = propSchema.items as Record<string, unknown> | undefined;
    if (!itemsSchema) continue;

    const firstItem = value[0];
    const itemType = itemsSchema.type as string | undefined;

    if (itemType === 'object' && (typeof firstItem !== 'object' || firstItem === null || Array.isArray(firstItem))) {
      const actualItemType = Array.isArray(firstItem) ? 'array' : typeof firstItem;
      issues.push(
        `Field "${key}" items should be objects, but first item is ${actualItemType}. Expected shape: ${JSON.stringify(Object.keys((itemsSchema.properties ?? {}) as object))}.`,
      );
    } else if (itemType === 'string' && typeof firstItem !== 'string') {
      issues.push(`Field "${key}" items should be strings, but first item is ${typeof firstItem}.`);
    } else if (itemType === 'array' && !Array.isArray(firstItem)) {
      issues.push(`Field "${key}" items should be arrays, but first item is ${typeof firstItem}.`);
    }
  }

  return { valid: issues.length === 0, issues };
}

// ── Execution — component (render only) ──────────────────────────────────────

export function executeComponent(
  args: { name: string; params?: unknown },
  callbacks: AgentCallbacks,
  options?: { schemaValidation?: boolean },
): string {
  if (!args.name) {
    return JSON.stringify({
      error: 'Missing component name. Call list_components() to see available components.',
    });
  }

  const comp = componentRegistry.get(args.name);
  if (comp) {
    const rawParams = (args.params as Record<string, unknown>) ?? {};

    // Option C: validate params against schema before executing
    if (options?.schemaValidation) {
      const validation = validateParams(rawParams, comp.inputSchema);
      if (!validation.valid) {
        return JSON.stringify({
          error: 'Invalid params — review the schema and re-call component() with corrected params.',
          component: comp.name,
          issues: validation.issues,
          schema: comp.inputSchema,
        });
      }
      // Valid params → execute directly (skip coercion path)
      return executeUITool(comp.toolName, rawParams, callbacks);
    }

    // Default path: execute with coercion (backward compat)
    return executeUITool(
      comp.toolName,
      rawParams,
      callbacks,
    );
  }

  return JSON.stringify({ error: `Composant inconnu : ${args.name}. Appelle list_components() pour la liste.` });
}
