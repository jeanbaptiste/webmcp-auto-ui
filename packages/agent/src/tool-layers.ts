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

/** Build system prompt — dynamic, recipe-driven workflow */
export function buildSystemPrompt(layers: ToolLayer[]): string {
  const mcpLayers = layers.filter((l): l is McpLayer => l.protocol === 'mcp');
  const webmcpLayers = layers.filter((l): l is WebMcpLayer => l.protocol === 'webmcp');

  // Build dynamic tool lists (only include servers that actually have these tools)
  const searchRecipes = [
    ...mcpLayers.filter(l => l.tools.some(t => t.name === 'search_recipes'))
      .map(l => `${l.serverName}_mcp_search_recipes()`),
    ...webmcpLayers.filter(l => l.tools.some(t => t.name === 'search_recipes'))
      .map(l => `${l.serverName}_webmcp_search_recipes()`),
  ].join(', ');

  const getRecipes = [
    ...mcpLayers.filter(l => l.tools.some(t => t.name === 'get_recipe'))
      .map(l => `${l.serverName}_mcp_get_recipe()`),
    ...webmcpLayers.filter(l => l.tools.some(t => t.name === 'get_recipe'))
      .map(l => `${l.serverName}_webmcp_get_recipe()`),
  ].join(', ');

  return `Tu es un assistant IA qui aide les utilisateurs en répondant à leurs questions et en accomplissant des tâches à l'aide de recettes. Pour CHAQUE nouvelle tâche, demande ou question, tu DOIS exécuter les étapes suivantes dans l'ordre exact. Tu NE DOIS PAS sauter d'étapes.

RÈGLE CRITIQUE : Tu DOIS exécuter toutes les étapes en silence. Ne génère et ne produis AUCUNE réflexion interne, raisonnement, explication ou texte intermédiaire, à AUCUNE étape.

1. Tout d'abord, trouve la recette la plus pertinente en utilisant les outils suivants pour découvrir les recettes disponibles.

${searchRecipes}

Après cette étape, tu DOIS passer à l'étape suivante.

2. Si une recette pertinente existe, utilise les outils suivants pour lire ses instructions.

${getRecipes}

3. Suis les instructions de la recette exactement pour accomplir la tâche. Tu NE DOIS PAS produire de réflexions intermédiaires ni de mises à jour de statut. Aucune exception ! Produis UNIQUEMENT le résultat final en cas de succès. Il doit contenir un résumé en une phrase de l'action effectuée, ainsi que le résultat final de la recette.

4. Sauf indication contraire d'une recette, utilise ces outils pour l'affichage de l'UI :

autoui_webmcp_widget_display
autoui_webmcp_canvas
autoui_webmcp_recall

Ne fabrique jamais d'URLs d'images — utilise uniquement celles retournées par les outils.`;
}

/**
 * Build discovery-only tools: search_recipes + get_recipe for each server,
 * plus "always present" WebMCP action tools (widget_display, canvas, recall).
 * Used as the initial tool set before any server is activated.
 */
export function buildDiscoveryTools(layers: ToolLayer[]): ProviderTool[] {
  const tools: ProviderTool[] = [];

  for (const layer of layers) {
    const prefix = `${layer.serverName}_${layer.protocol}_`;

    if (layer.protocol === 'mcp') {
      // MCP: only search_recipes and get_recipe
      for (const tool of toProviderTools(layer.tools)) {
        if (tool.name === 'search_recipes' || tool.name === 'get_recipe') {
          tools.push({ ...tool, name: `${prefix}${tool.name}` });
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
