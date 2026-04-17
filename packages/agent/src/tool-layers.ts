// ToolLayer types — structured layers for the agent loop

import type { McpToolDef, ProviderTool } from './types.js';
import type { McpRecipe } from './recipes/types.js';
import type { WebMcpToolDef, McpRecipeSummary } from '@webmcp-auto-ui/core';
import { sanitizeSchema, sanitizeSchemaWithReport, flattenSchema } from '@webmcp-auto-ui/core';
import type { SchemaPatch } from '@webmcp-auto-ui/core';
import { DiscoveryCache, type ServerCache } from './discovery-cache.js';
import type { PipelineTrace } from './pipeline-trace.js';

/** Sanitize a server name for use in tool name prefixes.
 *  Returns a clean underscore-separated identifier with no "mcp"/"server" noise.
 *  Final tool names follow {server}_{protocol}_{tool} convention. */
export function sanitizeServerName(name: string): string {
  let result = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')       // all non-alphanumeric → underscore
    .replace(/_{2,}/g, '_')             // collapse runs
    .replace(/^_|_$/g, '');             // trim edges
  // Remove noise segments: mcp, server, srv (anywhere in the name)
  result = result.split('_').filter(seg => !['mcp', 'server', 'srv'].includes(seg)).join('_');
  // Final cleanup
  result = result.replace(/^_|_$/g, '');
  return result || 'mcp';
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
  recipes?: McpRecipeSummary[];
}

export type ToolLayer = McpLayer | WebMcpLayer;

/** Options controlling how tool schemas are transformed before sending to the LLM */
export interface SchemaTransformOptions {
  /** Strip oneOf/anyOf/allOf/not/if-then-else/$ref (default: true) */
  sanitize?: boolean;
  /** Flatten nested object properties using key__subkey convention (default: false) */
  flatten?: boolean;
  /** Enable strict tool use (grammar-constrained sampling). Default: false */
  strict?: boolean;
  /** Called when a schema is auto-patched for strict mode */
  onSchemaPatch?: (toolName: string, patches: SchemaPatch[]) => void;
}

/**
 * @deprecated Use the `pathMaps` field returned by `buildToolsFromLayers()` instead.
 * This singleton is NOT parallel-safe — concurrent agent loops will clobber each other.
 * Kept for backward compatibility only; populated as a side-effect of `buildToolsFromLayers`.
 */
export const flattenPathMaps = new Map<string, Record<string, string[]>>();

/** Result of buildToolsFromLayers — tools + per-call path maps (parallel-safe) */
export interface BuildToolsResult {
  tools: ProviderTool[];
  /** Path maps for flattened schemas, keyed by prefixed tool name. Empty if flatten is off. */
  pathMaps: Map<string, Record<string, string[]>>;
}

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

/** Check if a schema is compatible with strict tool use.
 *  Anthropic requires additionalProperties to be exactly `false` — reject `true` and schema objects. */
function isStrictCompatible(schema: Record<string, unknown>): boolean {
  if (schema.additionalProperties === true) return false;
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') return false;
  if (schema.properties) {
    for (const prop of Object.values(schema.properties as Record<string, Record<string, unknown>>)) {
      if (prop && typeof prop === 'object' && !isStrictCompatible(prop)) return false;
    }
  }
  if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
    if (!isStrictCompatible(schema.items as Record<string, unknown>)) return false;
  }
  if (Array.isArray(schema.items)) {
    for (const item of schema.items) {
      if (item && typeof item === 'object' && !isStrictCompatible(item as Record<string, unknown>)) return false;
    }
  }
  for (const key of ['anyOf', 'allOf'] as const) {
    const arr = schema[key];
    if (Array.isArray(arr)) {
      for (const sub of arr) {
        if (sub && typeof sub === 'object' && !isStrictCompatible(sub as Record<string, unknown>)) return false;
      }
    }
  }
  return true;
}

/** Convert McpToolDef[] to ProviderTool[] */
export function toProviderTools(tools: McpToolDef[], schemaOptions?: SchemaTransformOptions, trace?: PipelineTrace): ProviderTool[] {
  return tools.map(t => {
    let schema = (t.inputSchema ?? { type: 'object', properties: {}, additionalProperties: false }) as import('@webmcp-auto-ui/core').JsonSchema;
    if (schemaOptions?.sanitize !== false) {
      const report = sanitizeSchemaWithReport(schema);
      schema = report.schema;
      if (report.patches.length > 0) {
        schemaOptions?.onSchemaPatch?.(t.name, report.patches);
        if (trace) {
          for (const p of report.patches) {
            const msg = p.type === 'additionalProperties'
              ? `added additionalProperties:false at ${p.path}`
              : `removed ${p.keyword} at ${p.path}`;
            trace.push('sanitize', t.name, msg, 'warn');
          }
        }
      }
    }
    const schemaObj = schema as Record<string, unknown>;
    // Ensure root schema has additionalProperties for strict mode
    if (schemaObj.type === 'object' && !('additionalProperties' in schemaObj)) {
      schemaObj.additionalProperties = false;
    }
    return {
      name: t.name,
      description: t.description ?? t.name,
      input_schema: schemaObj,
      strict: schemaOptions?.strict && isStrictCompatible(schemaObj) ? true : undefined,
    };
  });
}

/** Convert WebMcpToolDef[] to ProviderTool[] (Fix 12: sanitize schemas) */
function webmcpToProviderTools(tools: WebMcpToolDef[], schemaOptions?: SchemaTransformOptions, trace?: PipelineTrace): ProviderTool[] {
  return tools.map(t => {
    let schema = (t.inputSchema ?? { type: 'object', properties: {}, additionalProperties: false }) as import('@webmcp-auto-ui/core').JsonSchema;
    if (schemaOptions?.sanitize !== false) {
      const report = sanitizeSchemaWithReport(schema);
      schema = report.schema;
      if (report.patches.length > 0) {
        schemaOptions?.onSchemaPatch?.(t.name, report.patches);
        if (trace) {
          for (const p of report.patches) {
            const msg = p.type === 'additionalProperties'
              ? `added additionalProperties:false at ${p.path}`
              : `removed ${p.keyword} at ${p.path}`;
            trace.push('sanitize', t.name, msg, 'warn');
          }
        }
      }
    }
    const schemaObj = schema as Record<string, unknown>;
    return {
      name: t.name,
      description: t.description,
      input_schema: schemaObj,
      strict: schemaOptions?.strict && isStrictCompatible(schemaObj) ? true : undefined,
    };
  });
}

/** Build ProviderTool[] from structured layers.
 *  ALL tools are prefixed: {serverName}_{protocol}_{toolName}
 *  Returns { tools, pathMaps } — use pathMaps instead of the deprecated flattenPathMaps singleton.
 */
export function buildToolsFromLayers(layers: ToolLayer[], schemaOptions?: SchemaTransformOptions, trace?: PipelineTrace): BuildToolsResult {
  const tools: ProviderTool[] = [];

  for (const layer of layers) {
    const prefix = `${sanitizeServerName(layer.serverName)}_${layer.protocol}_`;

    if (layer.protocol === 'mcp') {
      for (const tool of toProviderTools(layer.tools, schemaOptions, trace)) {
        tools.push({ ...tool, name: `${prefix}${tool.name}` });
      }
    } else {
      for (const tool of webmcpToProviderTools(layer.tools, schemaOptions, trace)) {
        tools.push({ ...tool, name: `${prefix}${tool.name}` });
      }
    }
  }

  // Deduplicate by tool name (last-wins)
  const seen = new Map<string, ProviderTool>();
  for (const tool of tools) {
    seen.set(tool.name, tool);
  }

  const localPathMaps = new Map<string, Record<string, string[]>>();

  // Apply flatten if requested
  if (schemaOptions?.flatten) {
    const result = Array.from(seen.values());
    for (const tool of result) {
      const { schema: flatSchema, pathMap } = flattenSchema(tool.input_schema as import('@webmcp-auto-ui/core').JsonSchema);
      if (Object.keys(pathMap).length > 0) {
        tool.input_schema = flatSchema as Record<string, unknown>;
        localPathMaps.set(tool.name, pathMap);
      }
      if (trace) {
        const flattenedCount = Object.keys(pathMap).filter(k => pathMap[k].length > 1).length;
        const totalProps = Object.keys((tool.input_schema as Record<string, unknown>).properties ?? {}).length;
        if (flattenedCount === 0 && totalProps > 0) {
          trace.push('flatten', tool.name, `0/${totalProps} properties flattened`, 'warn');
        }
      }
    }

    // Populate deprecated singleton for backward compat
    flattenPathMaps.clear();
    for (const [k, v] of localPathMaps) flattenPathMaps.set(k, v);

    return { tools: result, pathMaps: localPathMaps };
  }

  return { tools: Array.from(seen.values()), pathMaps: localPathMaps };
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

  // ── Build prompt (cascade: list recipes → search recipes → list tools → search tools) ──
  let prompt = `You are an AI assistant that helps users by answering their questions and completing tasks using recipes (also called skills). These are not cooking recipes but instructions for an AI agent with scripts, schemas, and information to help it. If you cannot find a relevant recipe or tool, you may fall back to a traditional chat without tool calling (STEP 5).

You MUST NOT skip steps.

CRITICAL RULE: You MUST execute all steps silently. Do NOT generate any internal reasoning, thinking, or intermediate text.

STEP 1 — List all recipes

Look for a relevant recipe among these:

${listRecipes.join('\n')}

If at least one relevant recipe is found → go to STEP 2.
If no results → go to STEP 1b.

STEP 1b — Search recipes

No recipe found by listing. Search with keyword(s) extracted from the request:

${searchRecipes.join('\n')}

Pick the most relevant recipe for the request.
If a recipe matches → go to STEP 2.
If no recipe is available or relevant → go to STEP 1c.

STEP 1c — List tools

No applicable recipe. List a relevant tool:

${listTools.join('\n')}

If a relevant tool is found → use it directly to respond (go to STEP 3).
If no results → go to STEP 1d.

STEP 1d — Search tools

${searchTools.join('\n')}

Pick the most relevant tool(s) and use them to respond (go to STEP 3).

STEP 2 — Read the recipe

${getRecipes.join('\n')}

Read the full instructions of the selected recipe.

STEP 3 — Execute

Follow the recipe instructions exactly if you have one. Otherwise use the tools directly. Produce ONLY the final result, a one-sentence summary of the action performed, and the result.

STEP 4 — UI display

Unless a recipe specifies otherwise, use these tools to display your responses on the canvas:

${actionTools.join('\n')}

widget_display may ONLY be called with data returned by a non-autoui DATA tool actually invoked in the current session. Fabricating IDs, URLs, names, dates, or any content not returned by a tool is a critical violation. If no DATA tool has been called yet, go back to STEP 1.

STEP 5 — Fallback

If previous steps failed, fall back to a classic chat without tool calling.`;

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
export function buildDiscoveryToolsWithAliases(layers: ToolLayer[], schemaOptions?: SchemaTransformOptions, trace?: PipelineTrace): DiscoveryToolsResult {
  const tools: ProviderTool[] = [];
  const aliasMap = new Map<string, string>();

  for (const layer of layers) {
    const prefix = `${sanitizeServerName(layer.serverName)}_${layer.protocol}_`;

    if (layer.protocol === 'mcp') {
      const allProviderTools = toProviderTools(layer.tools, schemaOptions, trace);
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
        description: `Search tools by keyword on the ${layer.serverName} server. Use this when you need to find a specific data-fetching or action tool but don't know its exact name. Pass a keyword related to the task (e.g. "weather", "search", "create") and get back matching tool names with descriptions and input schemas. This is more targeted than list_tools — prefer it when you have a clear idea of what you're looking for. Returns an array of {name, description, inputSchema} objects.`,
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Keyword to search for in tool names and descriptions, e.g. "weather", "user", "search". Case-insensitive.' } }, required: ['query'] },
      });
      tools.push({
        name: `${prefix}list_tools`,
        description: `List ALL available tools on the ${layer.serverName} server with their names, descriptions, and input schemas. Use this when search_tools returned no results, or when you want to browse the full capabilities of the server. Returns the complete tool catalog — useful when the user's request doesn't map to an obvious keyword. Does not accept any parameters.`,
        input_schema: { type: 'object', properties: {} },
      });
    } else {
      // WebMCP: search_recipes, list_recipes, get_recipe, plus action tools (widget_display, canvas, recall)
      for (const tool of webmcpToProviderTools(layer.tools, schemaOptions, trace)) {
        if (tool.name === 'search_recipes' || tool.name === 'list_recipes' || tool.name === 'get_recipe' ||
            tool.name === 'widget_display' || tool.name === 'canvas' || tool.name === 'recall') {
          tools.push({ ...tool, name: `${prefix}${tool.name}` });
        }
      }

      // Pseudo-tools for tool discovery on WebMCP servers
      tools.push({
        name: `${prefix}search_tools`,
        description: `Search tools by keyword on the ${layer.serverName} server. Use this when you need to find a specific data-fetching or action tool but don't know its exact name. Pass a keyword related to the task (e.g. "weather", "search", "create") and get back matching tool names with descriptions and input schemas. This is more targeted than list_tools — prefer it when you have a clear idea of what you're looking for. Returns an array of {name, description, inputSchema} objects.`,
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Keyword to search for in tool names and descriptions, e.g. "weather", "user", "search". Case-insensitive.' } }, required: ['query'] },
      });
      tools.push({
        name: `${prefix}list_tools`,
        description: `List ALL available tools on the ${layer.serverName} server with their names, descriptions, and input schemas. Use this when search_tools returned no results, or when you want to browse the full capabilities of the server. Returns the complete tool catalog — useful when the user's request doesn't map to an obvious keyword. Does not accept any parameters.`,
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
  schemaOptions?: SchemaTransformOptions,
  trace?: PipelineTrace,
): ProviderTool[] {
  const prefix = `${sanitizeServerName(layer.serverName)}_${layer.protocol}_`;
  const existing = new Set(currentTools.map(t => t.name));
  const newTools = [...currentTools];

  const layerTools = layer.protocol === 'mcp'
    ? toProviderTools(layer.tools, schemaOptions, trace)
    : webmcpToProviderTools(layer.tools, schemaOptions, trace);

  for (const tool of layerTools) {
    const prefixed = `${prefix}${tool.name}`;
    if (!existing.has(prefixed)) {
      newTools.push({ ...tool, name: prefixed });
    }
  }

  return newTools;
}

/**
 * Build a DiscoveryCache from tool layers.
 * Pre-populates recipes and tool schemas for instant local lookups.
 */
export function buildDiscoveryCache(layers: ToolLayer[]): DiscoveryCache {
  const cache = new DiscoveryCache();

  for (const layer of layers) {
    // Skip WebMCP layers — their discovery tools (list_recipes, etc.) are local
    // closures over the widgets Map and must be executed directly, not cached.
    if (layer.protocol === 'webmcp') continue;

    const prefix = sanitizeServerName(layer.serverName);
    const serverCache: ServerCache = {
      recipes: [],
      tools: layer.tools.map(t => ({
        name: t.name,
        description: (t as any).description ?? t.name,
        inputSchema: (t as any).inputSchema ?? (t as any).input_schema,
      })),
    };

    // Add recipes if the layer has them
    if ('recipes' in layer && Array.isArray((layer as any).recipes)) {
      serverCache.recipes = (layer as any).recipes;
    }

    cache.register(prefix, serverCache);
  }

  return cache;
}
