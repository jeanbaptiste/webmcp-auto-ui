// ToolLayer types — structured layers for the agent loop

import type { McpToolDef, ProviderTool } from './types.js';
import type { McpRecipe } from './recipes/types.js';
import type { WebMcpToolDef } from '@webmcp-auto-ui/core';
import { sanitizeSchema } from '@webmcp-auto-ui/core';

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

type CanonicalRole = 'search_recipes' | 'get_recipe';

interface CanonicalMatch {
  role: CanonicalRole;
  realToolName: string;
}

// Action verbs by canonical role
const SEARCH_ACTIONS = ['search', 'list', 'find', 'browse', 'discover', 'query', 'explore'];
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
  const isGet = GET_ACTIONS.includes(action);
  if (!isSearch && !isGet) return null;

  const isResource = ALL_RESOURCES.includes(resource);
  if (!isResource) return null;

  return isSearch ? 'search_recipes' : 'get_recipe';
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
    if (t.name === 'get_recipe' && !found.has('get_recipe')) {
      found.set('get_recipe', { role: 'get_recipe', realToolName: t.name });
    }
    if (found.size === 2) return Array.from(found.values()); // early exit
  }

  // Layer 2 — Decompose name into (action, resource)
  for (const t of tools) {
    const tokens = tokenize(t.name);
    if (tokens.length < 2) continue;
    // Try all adjacent (action, resource) pairs
    for (let i = 0; i < tokens.length - 1; i++) {
      const role = matchRole(tokens[i], tokens[i + 1]);
      if (role && !found.has(role)) {
        found.set(role, { role, realToolName: t.name });
      }
    }
    if (found.size === 2) return Array.from(found.values());
  }

  // Layer 3 — Scan description for keywords
  for (const t of tools) {
    if (!t.description) continue;
    const desc = t.description.toLowerCase();
    const hasRecipeKeyword = DESC_KEYWORDS.some(k => desc.includes(k));
    if (!hasRecipeKeyword) continue;

    const tokens = tokenize(t.name);
    const action = tokens[0];
    if (SEARCH_ACTIONS.includes(action) && !found.has('search_recipes')) {
      found.set('search_recipes', { role: 'search_recipes', realToolName: t.name });
    } else if (GET_ACTIONS.includes(action) && !found.has('get_recipe')) {
      found.set('get_recipe', { role: 'get_recipe', realToolName: t.name });
    }
    if (found.size === 2) return Array.from(found.values());
  }

  return Array.from(found.values());
}

/**
 * Global alias map: maps prefixed canonical name → prefixed real tool name.
 * Used by the dispatch in loop.ts to resolve aliases transparently.
 * Rebuilt each time buildSystemPrompt() or buildDiscoveryTools() is called.
 */
export const toolAliasMap = new Map<string, string>();

/** Convert McpToolDef[] to ProviderTool[] */
export function toProviderTools(tools: McpToolDef[]): ProviderTool[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description ?? t.name,
    input_schema: sanitizeSchema(
      (t.inputSchema ?? { type: 'object', properties: {} }) as import('@webmcp-auto-ui/core').JsonSchema
    ) as Record<string, unknown>,
  }));
}

/** Convert WebMcpToolDef[] to ProviderTool[] (Fix 12: sanitize schemas) */
function webmcpToProviderTools(tools: WebMcpToolDef[]): ProviderTool[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: sanitizeSchema(
      (t.inputSchema ?? { type: 'object', properties: {} }) as import('@webmcp-auto-ui/core').JsonSchema
    ) as Record<string, unknown>,
  }));
}

/** Build ProviderTool[] from structured layers.
 *  ALL tools are prefixed: {serverName}_{protocol}_{toolName}
 */
export function buildToolsFromLayers(layers: ToolLayer[]): ProviderTool[] {
  const tools: ProviderTool[] = [];

  for (const layer of layers) {
    const prefix = `${layer.serverName}_${layer.protocol}_`;

    if (layer.protocol === 'mcp') {
      for (const tool of toProviderTools(layer.tools)) {
        tools.push({ ...tool, name: `${prefix}${tool.name}` });
      }
    } else {
      for (const tool of webmcpToProviderTools(layer.tools)) {
        tools.push({ ...tool, name: `${prefix}${tool.name}` });
      }
    }
  }

  // Deduplicate by tool name (last-wins)
  const seen = new Map<string, ProviderTool>();
  for (const tool of tools) {
    seen.set(tool.name, tool);
  }
  return Array.from(seen.values());
}

/** Build system prompt — dynamic, recipe-driven workflow.
 *  Uses 4-layer matching to detect recipe tools on MCP servers,
 *  then injects them under canonical names (search_recipes / get_recipe).
 *  Populates toolAliasMap so the dispatch in loop.ts can resolve aliases.
 */
export function buildSystemPrompt(layers: ToolLayer[]): string {
  const mcpLayers = layers.filter((l): l is McpLayer => l.protocol === 'mcp');
  const webmcpLayers = layers.filter((l): l is WebMcpLayer => l.protocol === 'webmcp');

  // Reset alias map
  toolAliasMap.clear();

  // ── Collect search_recipes / get_recipe from all layers ──
  const searchRecipes: string[] = [];
  const getRecipes: string[] = [];
  const mcpFallbackServers: McpLayer[] = []; // servers with no recipe tools at all

  // WebMCP layers: always exact match (we control the naming)
  for (const l of webmcpLayers) {
    const prefix = `${l.serverName}_webmcp_`;
    for (const t of l.tools) {
      if (t.name === 'search_recipes') searchRecipes.push(`${prefix}search_recipes()`);
      if (t.name === 'get_recipe') getRecipes.push(`${prefix}get_recipe()`);
    }
  }

  // MCP layers: 4-layer matching + alias registration
  for (const l of mcpLayers) {
    const prefix = `${l.serverName}_mcp_`;
    const matches = resolveCanonicalTools(l.tools);

    if (matches.length === 0) {
      mcpFallbackServers.push(l);
      continue;
    }

    for (const m of matches) {
      const canonicalPrefixed = `${prefix}${m.role}`;
      const realPrefixed = `${prefix}${m.realToolName}`;

      // Register alias only if names differ
      if (m.role !== m.realToolName) {
        toolAliasMap.set(canonicalPrefixed, realPrefixed);
      }

      if (m.role === 'search_recipes') searchRecipes.push(`${canonicalPrefixed}()`);
      if (m.role === 'get_recipe') getRecipes.push(`${canonicalPrefixed}()`);
    }
  }

  // ── WebMCP action tools (widget_display, canvas, recall) ──
  const actionTools: string[] = [];
  const ACTION_NAMES = ['widget_display', 'canvas', 'recall'];
  for (const l of webmcpLayers) {
    const prefix = `${l.serverName}_webmcp_`;
    for (const t of l.tools) {
      if (ACTION_NAMES.includes(t.name)) actionTools.push(`${prefix}${t.name}`);
    }
  }

  // ── Build prompt (same structure as original) ──
  let prompt = `Tu es un assistant IA qui aide les utilisateurs en répondant à leurs questions et en accomplissant des tâches à l'aide de recettes. Pour CHAQUE nouvelle tâche, demande ou question, tu DOIS exécuter les étapes suivantes dans l'ordre exact. Tu NE DOIS PAS sauter d'étapes.

RÈGLE CRITIQUE : Tu DOIS exécuter toutes les étapes en silence. Ne génère et ne produis AUCUNE réflexion interne, raisonnement, explication ou texte intermédiaire, à AUCUNE étape.

1. Tout d'abord, trouve la recette la plus pertinente en utilisant les outils suivants pour découvrir les recettes disponibles.

${searchRecipes.join('\n')}

Après cette étape, tu DOIS passer à l'étape suivante.

2. Si une recette pertinente existe, utilise les outils suivants pour lire ses instructions.

${getRecipes.join('\n')}

3. Suis les instructions de la recette exactement pour accomplir la tâche. Tu NE DOIS PAS produire de réflexions intermédiaires ni de mises à jour de statut. Aucune exception ! Produis UNIQUEMENT le résultat final en cas de succès. Il doit contenir un résumé en une phrase de l'action effectuée, ainsi que le résultat final de la recette.

4. Sauf indication contraire d'une recette, utilise ces outils pour l'affichage de l'UI :

${actionTools.join('\n')}`;

  // Layer 4 fallback: servers with no recipe tools — list their raw tools
  if (mcpFallbackServers.length > 0) {
    const fallbackLines: string[] = [];
    for (const l of mcpFallbackServers) {
      const prefix = `${l.serverName}_mcp_`;
      const toolNames = l.tools.map(t => `${prefix}${t.name}()`).join(', ');
      fallbackLines.push(`- ${l.serverName} : ${toolNames}`);
    }
    prompt += `\n\n5. Ces serveurs ne proposent pas de recettes mais exposent ces outils :\n\n${fallbackLines.join('\n')}`;
  }

  prompt += `\n\nNe fabrique jamais d'URLs d'images — utilise uniquement celles retournées par les outils.`;

  return prompt;
}

/**
 * Build discovery-only tools: search_recipes + get_recipe for each server,
 * plus "always present" WebMCP action tools (widget_display, canvas, recall).
 * Used as the initial tool set before any server is activated.
 *
 * For MCP servers, uses 4-layer matching to find recipe tools and exposes
 * them under canonical names (with aliases registered in toolAliasMap).
 */
export function buildDiscoveryTools(layers: ToolLayer[]): ProviderTool[] {
  const tools: ProviderTool[] = [];

  for (const layer of layers) {
    const prefix = `${layer.serverName}_${layer.protocol}_`;

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
          toolAliasMap.set(canonicalPrefixed, realPrefixed);
        }
      }
    } else {
      // WebMCP: search_recipes, get_recipe, plus action tools (widget_display, canvas, recall)
      for (const tool of webmcpToProviderTools(layer.tools)) {
        if (tool.name === 'search_recipes' || tool.name === 'get_recipe' ||
            tool.name === 'widget_display' || tool.name === 'canvas' || tool.name === 'recall') {
          tools.push({ ...tool, name: `${prefix}${tool.name}` });
        }
      }
    }
  }

  // Deduplicate
  const seen = new Map<string, ProviderTool>();
  for (const tool of tools) {
    seen.set(tool.name, tool);
  }
  return Array.from(seen.values());
}

/**
 * Add all tools from a specific server layer to the active tool set.
 * Called when a server is "touched" for the first time.
 */
export function activateServerTools(
  currentTools: ProviderTool[],
  layer: ToolLayer,
): ProviderTool[] {
  const prefix = `${layer.serverName}_${layer.protocol}_`;
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
