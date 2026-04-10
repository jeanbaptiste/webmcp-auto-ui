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
  return recipes.map(r => {
    let line = `- ${r.name}: ${r.when}`;
    if (r.components_used?.length) line += ` [${r.components_used.join(', ')}]`;
    // Extract the key instruction from the body (first line of "## Comment" or "## Erreurs")
    if (r.body) {
      const errMatch = r.body.match(/erreurs?\s+courantes?\s*\n+[-*]\s*\*?\*?(.+)/i);
      const howMatch = r.body.match(/comment\s*\n+1\.\s*\*?\*?(.+)/i);
      const hint = errMatch?.[1]?.replace(/\*\*/g, '').trim() ?? howMatch?.[1]?.replace(/\*\*/g, '').trim();
      if (hint) line += `\n  → ${hint.slice(0, 120)}`;
    }
    return line;
  }).join('\n');
}

/** Format MCP server recipes for the prompt.
 * Uses [name] prefix so LLMs know the exact ID to pass to get_recipe(). */
export function formatMcpRecipesForPrompt(recipes: McpRecipe[]): string {
  if (recipes.length === 0) return '';
  return recipes.map(r =>
    `- [${r.name}]${r.description ? ' ' + r.description : ''}`
  ).join('\n');
}
