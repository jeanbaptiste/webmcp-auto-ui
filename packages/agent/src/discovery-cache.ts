/**
 * DiscoveryCache — pre-fetched recipes and tool schemas per server.
 * Discovery tool calls (search_recipes, list_recipes, get_recipe, search_tools, list_tools)
 * are resolved locally from cache instead of dispatching to the MCP server.
 */

import type { ProviderTool } from './types.js';
import type { PipelineTrace } from './pipeline-trace.js';

/** Tool names that are resolved locally from cache — hidden from user-facing browsers. */
export const DISCOVERY_TOOL_NAMES = new Set([
  'list_recipes', 'search_recipes', 'get_recipe',
  'list_tools', 'search_tools',
  'allRecipes', 'allTools', // global (non-prefixed) discovery tools
]);

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
    trace?: PipelineTrace,
  ): string | null {
    const cache = this.servers.get(serverPrefix);
    if (!cache) return null;

    switch (realToolName) {
      case 'search_recipes': {
        const rawQuery = params.query ?? params.q ?? params.keyword ?? params.search;
        const query = String(rawQuery ?? '').toLowerCase();
        if (rawQuery === undefined && Object.keys(params).length > 0) {
          trace?.push('discovery', realToolName, `unknown param keys: ${Object.keys(params).join(',')} — expected query/q/keyword/search`, 'warn');
        }
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
        const rawKey = params.name ?? params.id ?? params.recipe_id ?? params.key;
        const key = String(rawKey ?? '').toLowerCase();
        if (rawKey === undefined && Object.keys(params).length > 0) {
          trace?.push('discovery', realToolName, `unknown param keys: ${Object.keys(params).join(',')} — expected name/id/recipe_id/key`, 'warn');
        }
        const recipe = cache.recipes.find(r =>
          (r.name?.toLowerCase() === key) ||
          ((r as Record<string, unknown>).id as string | undefined)?.toLowerCase() === key
        );
        if (!recipe) return JSON.stringify({ error: `Recipe "${key}" not found` });
        return JSON.stringify(recipe);
      }

      case 'search_tools': {
        const rawQuery = params.query ?? params.q ?? params.keyword ?? params.search;
        const query = String(rawQuery ?? '').toLowerCase();
        if (rawQuery === undefined && Object.keys(params).length > 0) {
          trace?.push('discovery', realToolName, `unknown param keys: ${Object.keys(params).join(',')} — expected query/q/keyword/search`, 'warn');
        }
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

  /**
   * Resolve a global (non-prefixed) discovery tool call across all cached servers.
   * Used by allRecipes/allTools/get_recipe which take a `server` param.
   * Returns the result string if handled, or null if not a global discovery tool.
   */
  resolveGlobal(
    toolName: string,
    params: Record<string, unknown>,
    trace?: PipelineTrace,
  ): string | null {
    switch (toolName) {
      case 'allRecipes': {
        const server = String(params.server ?? '');
        if (!server) {
          trace?.push('discovery', toolName, 'missing required param: server', 'warn');
          return JSON.stringify({ error: 'Missing required param: server' });
        }
        // Match server by exact name, prefix, or sanitized prefix
        const cache = this.findCacheByServer(server);
        if (!cache) return JSON.stringify({ error: `Server "${server}" not found or not connected` });
        return JSON.stringify(cache.recipes.map(r => ({ name: r.name, description: r.description })));
      }
      case 'allTools': {
        const server = String(params.server ?? '');
        if (!server) {
          trace?.push('discovery', toolName, 'missing required param: server', 'warn');
          return JSON.stringify({ error: 'Missing required param: server' });
        }
        const cache = this.findCacheByServer(server);
        if (!cache) return JSON.stringify({ error: `Server "${server}" not found or not connected` });
        return JSON.stringify(cache.tools);
      }
      case 'get_recipe': {
        const server = String(params.server ?? '');
        const name = String(params.name ?? params.id ?? '');
        if (!server || !name) {
          return JSON.stringify({ error: 'Missing required param(s): server and name' });
        }
        const cache = this.findCacheByServer(server);
        if (!cache) return JSON.stringify({ error: `Server "${server}" not found` });
        const recipe = cache.recipes.find(r => (r.name?.toLowerCase() === name.toLowerCase()));
        if (!recipe) return JSON.stringify({ error: `Recipe "${name}" not found on server "${server}"` });
        return JSON.stringify(recipe);
      }
      default:
        return null;
    }
  }

  private findCacheByServer(server: string): ServerCache | undefined {
    const normalized = server.toLowerCase();
    for (const [prefix, cache] of this.servers) {
      if (prefix.toLowerCase() === normalized) return cache;
      // Try sanitized prefix too (e.g. "tricoteuses_mcp" or "tricoteuses")
      const bare = prefix.toLowerCase().replace(/_mcp$|_webmcp$/, '');
      if (bare === normalized) return cache;
    }
    return undefined;
  }
}
