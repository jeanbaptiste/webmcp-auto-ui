// Recipe registry — singleton Map with read-only API + helpers

import type { Recipe, McpRecipe } from './recipes/types.js';

const _recipes = new Map<string, Recipe>();

/** Read-only recipe registry */
export const recipeRegistry = {
  get(id: string): Recipe | undefined { return _recipes.get(id); },
  getAll(): Recipe[] { return Array.from(_recipes.values()); },
  has(id: string): boolean { return _recipes.has(id); },
  get size(): number { return _recipes.size; },
};

/** Populate the registry (additive — does not clear existing entries) */
export function registerRecipes(recipes: Recipe[]): void {
  for (const r of recipes) {
    _recipes.set(r.id, r);
  }
}

/**
 * Filter recipes that match at least one of the given server names.
 * Uses substring matching: recipe server "tricoteuses" matches connected server
 * "Tricoteuses - Moulineuse" or "tricoteuses-mcp".
 */
export function filterRecipesByServer(recipes: Recipe[], serverNames: string[]): Recipe[] {
  if (serverNames.length === 0) return recipes;
  const lowerNames = serverNames.map(s => s.toLowerCase());
  return recipes.filter(r => {
    if (!r.servers || r.servers.length === 0) return true; // no server constraint = always match
    return r.servers.some(recipeServer => {
      const lower = recipeServer.toLowerCase();
      return lowerNames.some(name => name.includes(lower) || lower.includes(name));
    });
  });
}

/** Format recipes for injection into the system prompt (compact, <500 tokens for 5 recipes) */
export function formatRecipesForPrompt(recipes: Recipe[]): string {
  if (recipes.length === 0) return '';
  return recipes.map(r =>
    `- ${r.name}: ${r.when}` +
    (r.components_used?.length ? ` [${r.components_used.join(', ')}]` : '')
  ).join('\n');
}

/** Format MCP server recipes for the prompt */
export function formatMcpRecipesForPrompt(recipes: McpRecipe[]): string {
  if (recipes.length === 0) return '';
  return recipes.map(r =>
    `- ${r.name}${r.description ? ': ' + r.description : ''}`
  ).join('\n');
}
