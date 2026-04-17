/**
 * DiscoveryCache — pre-fetched recipes and tool schemas per server.
 * Discovery tool calls (search_recipes, list_recipes, get_recipe, search_tools, list_tools)
 * are resolved locally from cache instead of dispatching to the MCP server.
 */

import type { ProviderTool } from './types.js';

/** Tool names that are resolved locally from cache — hidden from user-facing browsers. */
export const DISCOVERY_TOOL_NAMES = new Set(['list_recipes', 'search_recipes', 'get_recipe', 'list_tools', 'search_tools']);

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

  /** All registered server prefixes */
  serverPrefixes(): string[] {
    return [...this.servers.keys()];
  }

  /** All recipes across all servers, tagged with their server prefix */
  allRecipes(): Array<CachedRecipe & { server: string }> {
    const result: Array<CachedRecipe & { server: string }> = [];
    for (const [prefix, cache] of this.servers) {
      for (const r of cache.recipes) result.push({ ...r, server: prefix });
    }
    return result;
  }

  /** All tools across all servers, tagged with their server prefix */
  allTools(): Array<{ name: string; description?: string; inputSchema?: Record<string, unknown>; server: string }> {
    const result: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown>; server: string }> = [];
    for (const [prefix, cache] of this.servers) {
      for (const t of cache.tools) result.push({ ...t, server: prefix });
    }
    return result;
  }

  /** Recipe count for a specific server */
  recipeCount(serverPrefix: string): number {
    return this.servers.get(serverPrefix)?.recipes.length ?? 0;
  }

  /** Get the cached recipes for a specific server prefix. */
  recipesFor(serverPrefix: string): CachedRecipe[] {
    return this.servers.get(serverPrefix)?.recipes ?? [];
  }

  /** Tool count for a specific server */
  toolCount(serverPrefix: string): number {
    return this.servers.get(serverPrefix)?.tools.length ?? 0;
  }

  /** Tool count excluding discovery tools (hidden from user-facing browsers) */
  browsableToolCount(serverPrefix: string): number {
    const tools = this.servers.get(serverPrefix)?.tools ?? [];
    return tools.filter(t => !DISCOVERY_TOOL_NAMES.has(t.name)).length;
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
        const key = String(params.name ?? params.id ?? '').toLowerCase();
        const recipe = cache.recipes.find(r =>
          (r.name?.toLowerCase() === key) ||
          ((r as Record<string, unknown>).id as string | undefined)?.toLowerCase() === key
        );
        if (!recipe) return JSON.stringify({ error: `Recipe "${key}" not found` });
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
