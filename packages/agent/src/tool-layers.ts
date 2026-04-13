// ToolLayer types — structured layers for the agent loop

import type { McpToolDef, ProviderTool } from './types.js';
import type { McpRecipe } from './recipes/types.js';
import type { WebMcpToolDef } from '@webmcp-auto-ui/core';
import { sanitizeSchema, flattenSchema } from '@webmcp-auto-ui/core';

/** Sanitize a server name for use in tool name prefixes.
 *  Tool names must match ^[a-zA-Z0-9_-]{1,128}$ per the Anthropic API. */
export function sanitizeServerName(name: string): string {
  let clean = name.replace(/\s*(MCP|mcp)\s*(Server|server)?\s*$/i, '').replace(/[_-]+(mcp|MCP)$/i, '').trim();
  if (!clean) clean = name;
  return clean.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '') || 'mcp';
}

/** MCP data layer — tools and recipes from a connected MCP server */
export interface McpLayer {
  protocol: 'mcp';
  serverName: string;
  description?: string;
  serverUrl?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}

/** WebMCP display layer — tools from a WebMCP server (e.g. autoui, designkit) */
export interface WebMcpLayer {
  protocol: 'webmcp';
  serverName: string;
  description: string;
  tools: WebMcpToolDef[];
}

export type ToolLayer = McpLayer | WebMcpLayer;

/** Options controlling how tool schemas are transformed before sending to the LLM */
export interface SchemaTransformOptions {
  /** Strip oneOf/anyOf/allOf/not/if-then-else/$ref (default: true) */
  sanitize?: boolean;
  /** Flatten nested object properties using key__subkey convention (default: false) */
  flatten?: boolean;
}

/** Path maps for flattened schemas — keyed by prefixed tool name */
export const flattenPathMaps = new Map<string, Record<string, string[]>>();

// ── Canonical tool resolution (4-layer matching) ─────────────────────
//
// MCP servers expose tools with arbitrary names. We need to identify which
// tools correspond to "search for recipes" and "get a specific recipe" so
// the system prompt can list them under canonical names.
//
// Layer 1 — Exact match on name
// Layer 2 — Decompose name into (action, resource), match action×resource
// Layer 3 — Scan tool description for keywords
// Layer 4 — Fallback: no recipe tools found, list raw discovery tools

type CanonicalRole = 'search_recipes' | 'list_recipes' | 'get_recipe';

interface CanonicalMatch {
  role: CanonicalRole;
  realToolName: string;
}

// Action verbs by canonical role
const SEARCH_ACTIONS = ['search', 'find', 'query'];
const LIST_ACTIONS = ['list', 'browse', 'explore', 'discover'];
const GET_ACTIONS = ['get', 'read', 'fetch', 'show', 'describe', 'detail', 'view', 'load'];

// Resource nouns by priority (A = recipe-like, B = template-like)
const RESOURCE_A = ['recipe', 'recipes', 'skill', 'skills'];
const RESOURCE_B = ['template', 'templates', 'prompt', 'prompts', 'workflow', 'workflows',
  'playbook', 'playbooks', 'pattern', 'patterns', 'example', 'examples'];
const ALL_RESOURCES = [...RESOURCE_A, ...RESOURCE_B];

// Description keywords for layer 3
const DESC_KEYWORDS = ['recipe', 'skill', 'template', 'workflow', 'playbook'];

function tokenize(name: string): string[] {
  // snake_case → tokens, also handles camelCase and kebab-case
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase()
    .split('_')
    .filter(Boolean);
}

function matchRole(action: string, resource: string): CanonicalRole | null {
  const isSearch = SEARCH_ACTIONS.includes(action);
  const isList = LIST_ACTIONS.includes(action);
  const isGet = GET_ACTIONS.includes(action);
  if (!isSearch && !isList && !isGet) return null;

  const isResource = ALL_RESOURCES.includes(resource);
  if (!isResource) return null;

  return isSearch ? 'search_recipes' : isList ? 'list_recipes' : 'get_recipe';
}

/**
 * Resolve canonical tools for a set of MCP tools using 4-layer matching.
 * Returns at most one match per canonical role.
 */
export function resolveCanonicalTools(tools: McpToolDef[]): CanonicalMatch[] {
  const found = new Map<CanonicalRole, CanonicalMatch>();

  // Layer 1 — Exact match
  for (const t of tools) {
    if (t.name === 'search_recipes' && !found.has('search_recipes')) {
      found.set('search_recipes', { role: 'search_recipes', realToolName: t.name });
    }
    if (t.name === 'list_recipes' && !found.has('list_recipes')) {
      found.set('list_recipes', { role: 'list_recipes', realToolName: t.name });
    }
    if (t.name === 'get_recipe' && !found.has('get_recipe')) {
      found.set('get_recipe', { role: 'get_recipe', realToolName: t.name });
    }
    if (found.size === 3) return Array.from(found.values()); // early exit
  }

  // Layer 2 — Decompose name into (action, resource), testing all pairs (not just adjacent)
  for (const t of tools) {
    const tokens = tokenize(t.name);
    if (tokens.length < 2) continue;
    for (const a of tokens) {
      for (const r of tokens) {
        if (a === r) continue;
        const role = matchRole(a, r);
        if (role && !found.has(role)) {
          found.set(role, { role, realToolName: t.name });
        }
      }
    }
    if (found.size === 3) return Array.from(found.values());
  }

  // Layer 3 — Scan description for keywords
  for (const t of tools) {
    if (!t.description) continue;
    const desc = t.description.toLowerCase();
    const hasRecipeKeyword = DESC_KEYWORDS.some(k => desc.includes(k));
    if (!hasRecipeKeyword) continue;

    const tokens = tokenize(t.name);
    const action = tokens[0];
    if (LIST_ACTIONS.includes(action) && !found.has('list_recipes')) {
      found.set('list_recipes', { role: 'list_recipes', realToolName: t.name });
    } else if (SEARCH_ACTIONS.includes(action) && !found.has('search_recipes')) {
      found.set('search_recipes', { role: 'search_recipes', realToolName: t.name });
    } else if (GET_ACTIONS.includes(action) && !found.has('get_recipe')) {
      found.set('get_recipe', { role: 'get_recipe', realToolName: t.name });
    }
    if (found.size === 3) return Array.from(found.values());
  }

  return Array.from(found.values());
}

/**
 * @deprecated Use buildSystemPromptWithAliases() or buildDiscoveryToolsWithAliases() instead.
 * Kept for backward compat — populated as a side-effect of buildSystemPrompt/buildDiscoveryTools.
 * NOT safe when multiple agent loops run in parallel.
 */
export const toolAliasMap = new Map<string, string>();

/** Convert McpToolDef[] to ProviderTool[] */
export function toProviderTools(tools: McpToolDef[], schemaOptions?: SchemaTransformOptions): ProviderTool[] {
  return tools.map(t => {
    let schema = (t.inputSchema ?? { type: 'object', properties: {} }) as import('@webmcp-auto-ui/core').JsonSchema;
    if (schemaOptions?.sanitize !== false) schema = sanitizeSchema(schema);
    return {
      name: t.name,
      description: t.description ?? t.name,
      input_schema: schema as Record<string, unknown>,
    };
  });
}

/** Convert WebMcpToolDef[] to ProviderTool[] (Fix 12: sanitize schemas) */
function webmcpToProviderTools(tools: WebMcpToolDef[], schemaOptions?: SchemaTransformOptions): ProviderTool[] {
  return tools.map(t => {
    let schema = (t.inputSchema ?? { type: 'object', properties: {} }) as import('@webmcp-auto-ui/core').JsonSchema;
    if (schemaOptions?.sanitize !== false) schema = sanitizeSchema(schema);
    return {
      name: t.name,
      description: t.description,
      input_schema: schema as Record<string, unknown>,
    };
  });
}

/** Build ProviderTool[] from structured layers.
 *  ALL tools are prefixed: {serverName}_{protocol}_{toolName}
 */
export function buildToolsFromLayers(layers: ToolLayer[], schemaOptions?: SchemaTransformOptions): ProviderTool[] {
  const tools: ProviderTool[] = [];

  for (const layer of layers) {
    const prefix = `${sanitizeServerName(layer.serverName)}_${layer.protocol}_`;

    if (layer.protocol === 'mcp') {
      for (const tool of toProviderTools(layer.tools, schemaOptions)) {
        tools.push({ ...tool, name: `${prefix}${tool.name}` });
      }
    } else {
      for (const tool of webmcpToProviderTools(layer.tools, schemaOptions)) {
        tools.push({ ...tool, name: `${prefix}${tool.name}` });
      }
    }
  }

  // Deduplicate by tool name (last-wins)
  const seen = new Map<string, ProviderTool>();
  for (const tool of tools) {
    seen.set(tool.name, tool);
  }

  // Apply flatten if requested
  if (schemaOptions?.flatten) {
    flattenPathMaps.clear();
    const result = Array.from(seen.values());
    for (const tool of result) {
      const { schema: flatSchema, pathMap } = flattenSchema(tool.input_schema as import('@webmcp-auto-ui/core').JsonSchema);
      if (Object.keys(pathMap).length > 0) {
        tool.input_schema = flatSchema as Record<string, unknown>;
        flattenPathMaps.set(tool.name, pathMap);
      }
    }
    return result;
  }

  return Array.from(seen.values());
}

/** Result of buildSystemPromptWithAliases — prompt text + per-call alias map */
export interface SystemPromptResult {
  prompt: string;
  aliasMap: Map<string, string>;
}

/**
 * Build system prompt with a local alias map (parallel-safe).
 * Prefer this over buildSystemPrompt() when running multiple agent loops.
 */
export function buildSystemPromptWithAliases(layers: ToolLayer[]): SystemPromptResult {
  const mcpLayers = layers.filter((l): l is McpLayer => l.protocol === 'mcp');
  const webmcpLayers = layers.filter((l): l is WebMcpLayer => l.protocol === 'webmcp');

  const aliasMap = new Map<string, string>();

  // ── Collect search_recipes / list_recipes / get_recipe from all layers ──
  const searchRecipes: string[] = [];
  const listRecipes: string[] = [];
  const getRecipes: string[] = [];
  const searchTools: string[] = [];
  const listTools: string[] = [];

  // WebMCP layers: always exact match (we control the naming)
  for (const l of webmcpLayers) {
    const prefix = `${sanitizeServerName(l.serverName)}_webmcp_`;
    for (const t of l.tools) {
      if (t.name === 'search_recipes') searchRecipes.push(`${prefix}search_recipes()`);
      if (t.name === 'list_recipes') listRecipes.push(`${prefix}list_recipes()`);
      if (t.name === 'get_recipe') getRecipes.push(`${prefix}get_recipe()`);
    }
    // Pseudo-tools for tool discovery on WebMCP servers
    searchTools.push(`${prefix}search_tools(query)`);
    listTools.push(`${prefix}list_tools()`);
  }

  // MCP layers: 4-layer matching + alias registration
  for (const l of mcpLayers) {
    const prefix = `${sanitizeServerName(l.serverName)}_mcp_`;
    const matches = resolveCanonicalTools(l.tools);

    for (const m of matches) {
      const canonicalPrefixed = `${prefix}${m.role}`;
      const realPrefixed = `${prefix}${m.realToolName}`;

      // Register alias only if names differ
      if (m.role !== m.realToolName) {
        aliasMap.set(canonicalPrefixed, realPrefixed);
      }

      if (m.role === 'search_recipes') searchRecipes.push(`${canonicalPrefixed}()`);
      if (m.role === 'list_recipes') listRecipes.push(`${canonicalPrefixed}()`);
      if (m.role === 'get_recipe') getRecipes.push(`${canonicalPrefixed}()`);
    }

    // Pseudo-tools for tool discovery on all MCP servers
    searchTools.push(`${prefix}search_tools(query)`);
    listTools.push(`${prefix}list_tools()`);
  }

  // ── WebMCP action tools (widget_display, canvas, recall) ──
  const actionTools: string[] = [];
  const ACTION_NAMES = ['widget_display', 'canvas', 'recall'];
  for (const l of webmcpLayers) {
    const prefix = `${sanitizeServerName(l.serverName)}_webmcp_`;
    for (const t of l.tools) {
      if (ACTION_NAMES.includes(t.name)) actionTools.push(`${prefix}${t.name}`);
    }
  }

  // ── Build prompt (cascade: search recipes → list recipes → search tools → list tools) ──
  let prompt = `Tu es un assistant IA qui aide les utilisateurs en répondant à leurs questions et en accomplissant des tâches à l'aide de recettes. Tu NE DOIS PAS sauter d'étapes.

RÈGLE CRITIQUE : Tu DOIS exécuter toutes les étapes en silence. Ne génère AUCUNE réflexion interne, raisonnement ou texte intermédiaire.

ÉTAPE 1 — Recherche de recette

Cherche une recette pertinente avec un mot-clé extrait de la demande :

${searchRecipes.join('\n')}

Si au moins une recette pertinente est trouvée → passe à l'ÉTAPE 2.
Si aucun résultat → passe à l'ÉTAPE 1b.

ÉTAPE 1b — Liste des recettes

Aucune recette trouvée par recherche. Liste toutes les recettes disponibles :

${listRecipes.join('\n')}

Choisis la recette la plus pertinente par rapport à la demande.
Si une recette correspond → passe à l'ÉTAPE 2.
Si aucune recette disponible ou pertinente → passe à l'ÉTAPE 1c.

ÉTAPE 1c — Recherche d'outils

Aucune recette applicable. Cherche un outil pertinent :

${searchTools.join('\n')}

Si un outil pertinent est trouvé → utilise-le directement pour répondre (passe à l'ÉTAPE 3).
Si aucun résultat → passe à l'ÉTAPE 1d.

ÉTAPE 1d — Liste des outils

${listTools.join('\n')}

Choisis le ou les outils les plus pertinents et utilise-les pour répondre (passe à l'ÉTAPE 3).

ÉTAPE 2 — Lecture de la recette

${getRecipes.join('\n')}

Lis les instructions complètes de la recette sélectionnée.

ÉTAPE 3 — Exécution

Suis les instructions de la recette exactement si tu en as une. Sinon utilise les outils directement. Produis UNIQUEMENT le résultat final : un résumé en une phrase de l'action effectuée, ainsi que le résultat.

ÉTAPE 4 — Affichage UI

Sauf indication contraire d'une recette, utilise ces outils :

${actionTools.join('\n')}

GESTION DES ERREURS D'OUTILS (RÈGLE PRIORITAIRE)

Si un outil retourne une erreur (validation, schéma, type, paramètres invalides ou rejet explicite), tu DOIS d'abord traiter cette erreur avant toute autre action.

1. Analyse uniquement le message d'erreur et le schéma attendu.
2. Corrige l'appel en respectant STRICTEMENT le schéma (pas de champs supplémentaires, types respectés).
3. Si une valeur est mal formée (ex: JSON sérialisé en string), convertis-la sans changer le contenu métier.
4. Tu n'as PAS le droit d'inventer de nouveaux formats, champs ou structures.
5. Ne change PAS de recette ou de widget tant que l'appel n'a pas été retenté au moins une fois.
6. Après deux échecs consécutifs identiques, tu peux chercher une autre recette.

Ne fabrique jamais d'URLs d'images — utilise uniquement celles retournées par les outils.`;

  return { prompt, aliasMap };
}

/** Build system prompt — backward-compatible wrapper that returns a plain string.
 *  Also populates the deprecated global toolAliasMap for legacy consumers.
 *  For parallel-safe usage, use buildSystemPromptWithAliases() instead.
 */
export function buildSystemPrompt(layers: ToolLayer[]): string {
  const { prompt, aliasMap } = buildSystemPromptWithAliases(layers);

  // Populate deprecated global singleton for backward compat
  toolAliasMap.clear();
  for (const [k, v] of aliasMap) toolAliasMap.set(k, v);

  return prompt;
}

/** Result of buildDiscoveryToolsWithAliases */
export interface DiscoveryToolsResult {
  tools: ProviderTool[];
  aliasMap: Map<string, string>;
}

/**
 * Build discovery-only tools with a local alias map (parallel-safe).
 * Prefer this over buildDiscoveryTools() when running multiple agent loops.
 */
export function buildDiscoveryToolsWithAliases(layers: ToolLayer[]): DiscoveryToolsResult {
  const tools: ProviderTool[] = [];
  const aliasMap = new Map<string, string>();

  for (const layer of layers) {
    const prefix = `${sanitizeServerName(layer.serverName)}_${layer.protocol}_`;

    if (layer.protocol === 'mcp') {
      const allProviderTools = toProviderTools(layer.tools);
      const matches = resolveCanonicalTools(layer.tools);

      for (const m of matches) {
        const realTool = allProviderTools.find(t => t.name === m.realToolName);
        if (!realTool) continue;

        // Expose under canonical name
        const canonicalPrefixed = `${prefix}${m.role}`;
        const realPrefixed = `${prefix}${m.realToolName}`;
        tools.push({ ...realTool, name: canonicalPrefixed });

        // Register alias if names differ
        if (m.role !== m.realToolName) {
          aliasMap.set(canonicalPrefixed, realPrefixed);
        }
      }

      // Pseudo-tools for tool discovery on MCP servers
      tools.push({
        name: `${prefix}search_tools`,
        description: `Search tools by keyword on ${layer.serverName}`,
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search keyword' } }, required: ['query'] },
      });
      tools.push({
        name: `${prefix}list_tools`,
        description: `List all available tools on ${layer.serverName}`,
        input_schema: { type: 'object', properties: {} },
      });
    } else {
      // WebMCP: search_recipes, list_recipes, get_recipe, plus action tools (widget_display, canvas, recall)
      for (const tool of webmcpToProviderTools(layer.tools)) {
        if (tool.name === 'search_recipes' || tool.name === 'list_recipes' || tool.name === 'get_recipe' ||
            tool.name === 'widget_display' || tool.name === 'canvas' || tool.name === 'recall') {
          tools.push({ ...tool, name: `${prefix}${tool.name}` });
        }
      }

      // Pseudo-tools for tool discovery on WebMCP servers
      tools.push({
        name: `${prefix}search_tools`,
        description: `Search tools by keyword on ${layer.serverName}`,
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search keyword' } }, required: ['query'] },
      });
      tools.push({
        name: `${prefix}list_tools`,
        description: `List all available tools on ${layer.serverName}`,
        input_schema: { type: 'object', properties: {} },
      });
    }
  }

  // Deduplicate
  const seen = new Map<string, ProviderTool>();
  for (const tool of tools) {
    seen.set(tool.name, tool);
  }
  return { tools: Array.from(seen.values()), aliasMap };
}

/**
 * Build discovery-only tools — backward-compatible wrapper.
 * Also populates the deprecated global toolAliasMap for legacy consumers.
 * For parallel-safe usage, use buildDiscoveryToolsWithAliases() instead.
 */
export function buildDiscoveryTools(layers: ToolLayer[]): ProviderTool[] {
  const { tools, aliasMap } = buildDiscoveryToolsWithAliases(layers);

  // Populate deprecated global singleton for backward compat
  for (const [k, v] of aliasMap) toolAliasMap.set(k, v);

  return tools;
}

/**
 * Add all tools from a specific server layer to the active tool set.
 * Called when a server is "touched" for the first time.
 */
export function activateServerTools(
  currentTools: ProviderTool[],
  layer: ToolLayer,
): ProviderTool[] {
  const prefix = `${sanitizeServerName(layer.serverName)}_${layer.protocol}_`;
  const existing = new Set(currentTools.map(t => t.name));
  const newTools = [...currentTools];

  const layerTools = layer.protocol === 'mcp'
    ? toProviderTools(layer.tools)
    : webmcpToProviderTools(layer.tools);

  for (const tool of layerTools) {
    const prefixed = `${prefix}${tool.name}`;
    if (!existing.has(prefixed)) {
      newTools.push({ ...tool, name: prefixed });
    }
  }

  return newTools;
}
