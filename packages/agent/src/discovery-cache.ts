/**
 * DiscoveryCache — pre-fetched recipes and tool schemas per server.
 * Discovery tool calls (search_recipes, list_recipes, get_recipe, search_tools, list_tools)
 * are resolved locally from cache instead of dispatching to the MCP server.
 */

import type { ProviderTool } from './types.js';

export interface CachedRecipe {
  name: string;
  description?: string;
  when?: string;
  components_used?: string[];
  servers?: string[];
  layout?: { type: string; columns?: number; arrangement?: string };
  body?: string;
  schema?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ServerCache {
  recipes: CachedRecipe[];
  tools: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>;
}

export class DiscoveryCache {
  private servers = new Map<string, ServerCache>();

  /** Register a server's recipes and tools */
  register(serverPrefix: string, data: ServerCache): void {
    this.servers.set(serverPrefix, data);
  }

  /** Check if we have cached data for a server prefix */
  has(serverPrefix: string): boolean {
    return this.servers.has(serverPrefix);
  }

  /** Clear all cached data */
  clear(): void {
    this.servers.clear();
  }

  /**
   * Try to resolve a discovery tool call from cache.
   * Returns the result string if handled, or null if not a discovery tool.
   *
   * @param serverPrefix Server prefix like "wikipedia"
   * @param realToolName Unprefixed tool name like "search_recipes"
   * @param params Tool call params
   */
  resolve(
    serverPrefix: string,
    realToolName: string,
    params: Record<string, unknown>,
  ): string | null {
    const cache = this.servers.get(serverPrefix);
    if (!cache) return null;

    switch (realToolName) {
      case 'search_recipes': {
        const query = ((params.query ?? '') as string).toLowerCase();
        const results = query
          ? cache.recipes.filter(r =>
              r.name.toLowerCase().includes(query) ||
              (r.description ?? '').toLowerCase().includes(query)
            )
          : cache.recipes;
        return JSON.stringify(results.map(r => ({ name: r.name, description: r.description })));
      }

      case 'list_recipes': {
        return JSON.stringify(cache.recipes.map(r => ({ name: r.name, description: r.description })));
      }

      case 'get_recipe': {
        const name = (params.name ?? '') as string;
        const recipe = cache.recipes.find(r => r.name.toLowerCase() === name.toLowerCase());
        if (!recipe) return JSON.stringify({ error: `Recipe "${name}" not found` });
        return JSON.stringify(recipe);
      }

      case 'search_tools': {
        const query = ((params.query ?? '') as string).toLowerCase();
        const results = query
          ? cache.tools.filter(t =>
              t.name.toLowerCase().includes(query) ||
              (t.description ?? '').toLowerCase().includes(query)
            )
          : cache.tools;
        return JSON.stringify(results);
      }

      case 'list_tools': {
        return JSON.stringify(cache.tools);
      }

      default:
        return null;
    }
  }
}
