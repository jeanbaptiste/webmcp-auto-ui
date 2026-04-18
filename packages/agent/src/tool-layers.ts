// ToolLayer types — structured layers for the agent loop

import type { McpToolDef, ProviderTool } from './types.js';
import type { McpRecipe } from './recipes/types.js';
import type { WebMcpToolDef, McpRecipeSummary } from '@webmcp-auto-ui/core';
import { sanitizeSchema, sanitizeSchemaWithReport, flattenSchema } from '@webmcp-auto-ui/core';
import type { SchemaPatch } from '@webmcp-auto-ui/core';
import { DiscoveryCache, type ServerCache } from './discovery-cache.js';
import type { PipelineTrace } from './pipeline-trace.js';
import { SERVER_SLUGS } from './server-slugs.js';

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

/** Which provider syntax to emit in the system prompt.
 *  - `generic`: `tool_name()` / `tool_name(arg1, arg2)` — Claude, Ollama, most providers.
 *  - `gemma`:   `<|tool_call>call:tool_name{}<tool_call|>` — Gemma 4 native format. */
export type ProviderKind = 'generic' | 'gemma';

/** Extract the first parameter name from a ProviderTool's input_schema.
 *  Priority: first required field > first property > fallback.
 *  Used to emit real parameter names in tool references for better prompting. */
function firstParamName(tool?: ProviderTool, fallback = 'query'): string {
  if (!tool?.input_schema) return fallback;
  const schema = tool.input_schema as Record<string, unknown>;
  const required = (schema.required as string[] | undefined) ?? [];
  if (required.length > 0) return required[0];
  const props = (schema.properties as Record<string, unknown> | undefined) ?? {};
  return Object.keys(props)[0] ?? fallback;
}

/** Format a tool reference for inclusion in the system prompt.
 *  Generic (Claude/Ollama/etc): `name()` or `name(arg1, arg2)`.
 *  Gemma: emits the full `<|tool>declaration:...<tool|>` block inline when a tool is provided,
 *         so declarations appear in context at each step of the workflow (no appendix).
 *         Falls back to a plain backtick reference if no tool is provided.
 */
function fmtToolRef(
  prefixedName: string,
  args: string[] = [],
  kind: ProviderKind = 'generic',
  tool?: ProviderTool,
): string {
  if (kind === 'gemma' && tool) {
    // Inline: full Gemma declaration with canonical prefixed name but real schema
    return formatGemmaToolDeclaration({ ...tool, name: prefixedName });
  }
  if (kind === 'gemma') {
    return args.length ? `\`${prefixedName}(${args.join(', ')})\`` : `\`${prefixedName}\``;
  }
  return args.length ? `${prefixedName}(${args.join(', ')})` : `${prefixedName}()`;
}

/**
 * Format a value for Gemma 4 native tool syntax.
 * Strings use <|"|> delimiters, numbers/booleans/null are bare.
 */
export function gemmaValue(v: unknown): string {
  const q = '<|"|>';
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(i => gemmaValue(i)).join(',')}]`;
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}:${gemmaValue(val)}`);
    return `{${entries.join(',')}}`;
  }
  return `${q}${String(v)}${q}`;
}

/**
 * Format a tool declaration in Gemma 4 native syntax.
 * Emitted in the system prompt tail so Gemma sees tool schemas alongside the
 * STEP-by-STEP instructions.
 */
export function formatGemmaToolDeclaration(tool: ProviderTool): string {
  const q = '<|"|>';
  let decl = `<|tool>declaration:${tool.name}{\n`;
  decl += `  description:${q}${tool.description}${q}`;

  const schema = tool.input_schema;
  if (schema?.properties) {
    const props = schema.properties as Record<string, { description?: string; type?: string; enum?: string[]; format?: string; default?: unknown }>;
    decl += `,\n  parameters:{\n    properties:{\n`;

    const propEntries = Object.entries(props);
    for (let i = 0; i < propEntries.length; i++) {
      const [key, val] = propEntries[i];
      decl += `      ${key}:{`;
      const parts: string[] = [];
      if (val.description) parts.push(`description:${q}${val.description}${q}`);
      // If no type specified, infer OBJECT for params-like fields to avoid
      // Gemma wrapping the value in <|"|>...<|"|> (treating it as a string)
      let inferredType = val.type;
      if (!inferredType) {
        const descLower = (val.description ?? '').toLowerCase();
        if (descLower.includes('objet') || descLower.includes('object') || descLower.includes('parameter') || descLower.includes('paramètre') || key === 'params') {
          inferredType = 'object';
        } else {
          inferredType = 'string';
        }
      }
      parts.push(`type:${q}${inferredType.toUpperCase()}${q}`);
      if (val.enum) parts.push(`enum:[${val.enum.map(e => `${q}${e}${q}`).join(',')}]`);
      if (val.format) parts.push(`format:${q}${val.format}${q}`);
      if (val.default !== undefined) parts.push(`default:${gemmaValue(val.default)}`);
      decl += parts.join(',');
      decl += `}${i < propEntries.length - 1 ? ',' : ''}\n`;
    }

    decl += `    }`;
    if (schema.required && Array.isArray(schema.required)) {
      decl += `,\n    required:[${(schema.required as string[]).map(r => `${q}${r}${q}`).join(',')}]`;
    }
    decl += `,\n    type:${q}OBJECT${q}\n  }`;
  }

  decl += `\n}<tool|>`;
  return decl;
}

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
 *
 * The `providerKind` option controls the syntax of tool references in the prompt:
 *  - `'generic'` (default): `tool_name()` / `tool_name(arg)` — for Claude, Ollama, etc.
 *  - `'gemma'`: `<|tool_call>call:tool_name{}<tool_call|>` — Gemma 4 native format.
 */
export function buildSystemPromptWithAliases(
  layers: ToolLayer[],
  options: { providerKind?: ProviderKind; template?: string } = {},
): SystemPromptResult {
  const kind = options.providerKind ?? 'generic';
  const mcpLayers = layers.filter((l): l is McpLayer => l.protocol === 'mcp');
  const webmcpLayers = layers.filter((l): l is WebMcpLayer => l.protocol === 'webmcp');

  // DISPLAY servers = WebMCP layers that expose widget_display (can render on canvas).
  // DATA servers = everything else (MCP servers + WebMCP without widget_display).
  const displayLayers = webmcpLayers.filter(l => l.tools.some(t => t.name === 'widget_display'));
  const dataLayers = layers.filter(l => !displayLayers.includes(l as WebMcpLayer));

  // Pre-build an index of prefixed tool name → ProviderTool so we can emit
  // real param names (and, for Gemma, inline declarations) at each call site.
  const providerToolsByName = new Map<string, ProviderTool>(
    buildToolsFromLayers(layers, { sanitize: true }).tools.map(t => [t.name, t]),
  );

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
      if (t.name === 'search_recipes') {
        const name = `${prefix}search_recipes`;
        const toolDef = providerToolsByName.get(name);
        searchRecipes.push(fmtToolRef(name, [firstParamName(toolDef, 'query')], kind, toolDef));
      }
      if (t.name === 'list_recipes') {
        const name = `${prefix}list_recipes`;
        const toolDef = providerToolsByName.get(name);
        listRecipes.push(fmtToolRef(name, [], kind, toolDef));
      }
      if (t.name === 'get_recipe') {
        const name = `${prefix}get_recipe`;
        const toolDef = providerToolsByName.get(name);
        getRecipes.push(fmtToolRef(name, [firstParamName(toolDef, 'id')], kind, toolDef));
      }
    }
    // Pseudo-tools for tool discovery on WebMCP servers — not in providerToolsByName,
    // so we build synthetic ProviderTools for inline declarations.
    const searchToolsPseudo: ProviderTool = {
      name: `${prefix}search_tools`,
      description: `Search tools by keyword on the ${l.serverName} server.`,
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Keyword to search for.' } }, required: ['query'] },
    };
    searchTools.push(fmtToolRef(`${prefix}search_tools`, ['query'], kind, searchToolsPseudo));
    const listToolsPseudo: ProviderTool = {
      name: `${prefix}list_tools`,
      description: `List ALL tools on the ${l.serverName} server.`,
      input_schema: { type: 'object', properties: {} },
    };
    listTools.push(fmtToolRef(`${prefix}list_tools`, [], kind, listToolsPseudo));
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

      // Look up the REAL tool (by real prefixed name) to get the actual schema
      const realToolDef = providerToolsByName.get(realPrefixed);

      if (m.role === 'search_recipes') {
        searchRecipes.push(fmtToolRef(canonicalPrefixed, [firstParamName(realToolDef, 'query')], kind, realToolDef));
      }
      if (m.role === 'list_recipes') {
        listRecipes.push(fmtToolRef(canonicalPrefixed, [], kind, realToolDef));
      }
      if (m.role === 'get_recipe') {
        getRecipes.push(fmtToolRef(canonicalPrefixed, [firstParamName(realToolDef, 'id')], kind, realToolDef));
      }
    }

    // Pseudo-tools for tool discovery on all MCP servers
    const searchToolsPseudo: ProviderTool = {
      name: `${prefix}search_tools`,
      description: `Search tools by keyword on the ${l.serverName} server.`,
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Keyword to search for.' } }, required: ['query'] },
    };
    searchTools.push(fmtToolRef(`${prefix}search_tools`, ['query'], kind, searchToolsPseudo));
    const listToolsPseudo: ProviderTool = {
      name: `${prefix}list_tools`,
      description: `List ALL tools on the ${l.serverName} server.`,
      input_schema: { type: 'object', properties: {} },
    };
    listTools.push(fmtToolRef(`${prefix}list_tools`, [], kind, listToolsPseudo));
  }

  // ── WebMCP action tools (widget_display, canvas, recall) ──
  // Iterate in canonical order (widget_display, canvas, recall) so the prompt
  // always lists them in the same sequence regardless of tool definition order.
  const actionTools: string[] = [];
  const ACTION_NAMES = ['widget_display', 'canvas', 'recall'];
  for (const l of webmcpLayers) {
    const prefix = `${sanitizeServerName(l.serverName)}_webmcp_`;
    for (const actionName of ACTION_NAMES) {
      if (l.tools.some(t => t.name === actionName)) {
        const prefixedName = `${prefix}${actionName}`;
        const toolDef = providerToolsByName.get(prefixedName);
        const args = actionName === 'widget_display' ? ['name', 'params'] : [];
        actionTools.push(fmtToolRef(prefixedName, args, kind, toolDef));
      }
    }
  }

  // Same refs, grouped by DATA vs DISPLAY category, for the gemma-minimalist template.
  const dataPrefixes = new Set(dataLayers.map(l => `${sanitizeServerName(l.serverName)}_${l.protocol}_`));
  const displayPrefixes = new Set(displayLayers.map(l => `${sanitizeServerName(l.serverName)}_webmcp_`));

  function splitByCategory(refs: string[]): { data: string[]; display: string[] } {
    // Refs may be backticked names, full declarations, or tool_name(arg) — in all cases,
    // the prefixed name (e.g. `tricoteuses_mcp_search_recipes`) is detectable by substring match.
    const data: string[] = [];
    const display: string[] = [];
    for (const ref of refs) {
      const isDisplay = [...displayPrefixes].some(p => ref.includes(p));
      if (isDisplay) display.push(ref);
      else data.push(ref);
    }
    return { data, display };
  }

  const listRecipesByCat = splitByCategory(listRecipes);
  const searchRecipesByCat = splitByCategory(searchRecipes);
  const getRecipesByCat = splitByCategory(getRecipes);
  // Suppress unused-variable warnings — dataPrefixes is referenced indirectly via dataLayers.
  void dataPrefixes;

  // ── Build prompt ──
  let prompt: string;

  if (kind === 'gemma') {
    const template = options.template ?? 'default';

    // Pre-split by DATA/DISPLAY
    const dataListRecipes = listRecipesByCat.data.join('\n');
    const displayListRecipes = listRecipesByCat.display.join('\n');
    const dataSearchRecipes = searchRecipesByCat.data.join('\n');
    const displaySearchRecipes = searchRecipesByCat.display.join('\n');
    const allGetRecipes = [
      ...getRecipesByCat.data,
      ...getRecipesByCat.display,
    ].join('\n');

    if (template === 'gemma-google-style') {
      // ── Google-style: pre-baked skill catalog, no list/search discovery ──
      const bakedSkills: string[] = [];
      for (const l of layers) {
        const prefix = `${sanitizeServerName(l.serverName)}_${l.protocol}_`;
        const recipes = ((l as any).recipes ?? []) as Array<{ name: string; description?: string }>;
        for (const r of recipes) {
          const desc = (r.description || '').split('\n')[0].slice(0, 120);
          bakedSkills.push(`- ${prefix}${r.name}${desc ? ` — ${desc}` : ''}`);
        }
      }

      prompt = `YOU are an AI assistant. Answer the user by executing SKILLS (named procedures with schemas and instructions).

YOU MUST execute all three steps silently. YOU MUST NOT expose intermediate output to the user.

SKILL CATALOG:
${bakedSkills.join('\n')}

STEP 1 — Pick the single most relevant skill from the catalog above.

STEP 2 — Load the skill:
${allGetRecipes}
Pass the skill name from STEP 1.

STEP 3 — Execute the loaded instructions. Reply ONLY the final result, one line summary + output.

Action tools (for display skills):
${actionTools.join('\n')}

YOU MUST NOT respond before STEP 3. Execute silently.`;
    } else if (template === 'gemma-strict-cascade') {
      // ── Strict 5-step cascade with "MUST NOT skip steps" rule ──
      prompt = `You are an AI assistant that helps users by answering their questions and completing tasks using recipes (also called skills) — instructions for an AI agent with scripts, schemas, and information. If no recipe or tool fits, fall back to a traditional chat (STEP 5).

You MUST NOT skip steps.

CRITICAL RULE: Do not output reasoning, thinking, or intermediate text in the final response. For trivial conversational messages such as greetings or small talk, skip directly to STEP 5.

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
The id comes from the result of list_recipes (STEP 1) or search_recipes (STEP 1b), whichever was called.

Read the full instructions of the selected recipe.

STEP 3 — Execute

Prefer recipes over direct tool calls when a recipe matches the task. Use low-level tools (DB queries, schema introspection, raw scripts) only when invoked from within a recipe's instructions.

Follow the recipe instructions exactly if you have one. Otherwise use the tools directly.

Output format: (1) a one-sentence summary of the action performed, then (2) the result. Nothing else.

STEP 4 — UI display

Unless a recipe specifies otherwise, use these tools to display your responses on the canvas:

${actionTools.join('\n')}

widget_display may ONLY be called with data returned by a non-autoui DATA tool actually invoked in the current session. Fabricating IDs, URLs, names, dates, or any content not returned by a tool is a critical violation. If no DATA tool has been called yet, go back to STEP 1.

STEP 5 — Fallback

If previous steps failed, fall back to a classic chat without tool calling.`;
    } else if (template === 'ghost') {
      // ── Ghost: Claude prompt (post-fixes) with Gemma tool-declaration syntax ──
      const reasoningRule = 'Do not narrate your process in the response. Internal reasoning is permitted but must not appear in the final output.';

      prompt = `You are an AI assistant that helps users by answering their questions and completing tasks using recipes (also called skills) — instructions for an AI agent with scripts, schemas, and information. If no recipe or tool fits, fall back to a traditional chat (STEP 5).

CRITICAL RULE: ${reasoningRule}

STEP 1 — List all recipes

Call one of these tools to list available recipes:

${listRecipes.join('\n')}

If at least one relevant recipe is found → go to STEP 2.
If no results → go to STEP 1b.

STEP 1b — Search recipes

Search recipes (fallback from STEP 1):

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
The id comes from the result of list_recipes (STEP 1) or search_recipes (STEP 1b), whichever was called.

Read the full instructions of the selected recipe.

STEP 3 — Execute

Prefer recipes over direct tool calls when a recipe matches the task. Use low-level tools (DB queries, schema introspection, raw scripts) only when invoked from within a recipe's instructions.

Follow the recipe instructions exactly if you have one. Otherwise use the tools directly.

Output format: (1) a one-sentence summary of the action performed, then (2) the result. Nothing else.

STEP 4 — UI display

Unless a recipe specifies otherwise, use these tools to display your responses on the canvas:

${actionTools.join('\n')}

widget_display requires data from a DATA tool call made earlier in this session. Without such data, reply in plain text instead of displaying. Never fabricate IDs, URLs, names, dates, or content not returned by a tool.

STEP 5 — Plain chat (no tools)

Use when: (a) the request is a greeting / small talk, (b) no recipe or tool fits, (c) previous steps failed to yield a match.`;
    } else if (template === 'gemma-lazy-cascade') {
      // ── Previous default: lazy cascade, DATA/DISPLAY split, Gemma syntax ──
      prompt = `You answer the user using recipes (skills) or direct tools. For greetings/small talk → reply directly with no tools.

Route: DATA (fetch) or DISPLAY (render on canvas).

STEP 1 — List recipes (try first, cheapest):
DATA:
${dataListRecipes}
DISPLAY:
${displayListRecipes}
If a relevant recipe appears → STEP 2. Else → STEP 1b.

STEP 1b — Search recipes (fallback from STEP 1):
DATA:
${dataSearchRecipes}
DISPLAY:
${displaySearchRecipes}
If a recipe matches → STEP 2. Else → STEP 1c.

STEP 1c — List tools directly:
${listTools.join('\n')}
If a relevant tool appears → use it directly (skip STEP 2, GO STEP 3). Else → STEP 1d.

STEP 1d — Search tools with a keyword:
${searchTools.join('\n')}
Pick the best tool and use it directly (GO STEP 3). If nothing fits → reply without tools.

STEP 2 — Read the recipe (only if STEP 1 or 1b found a match):
${allGetRecipes}

STEP 3 — Execute.
- Data: follow the recipe (SQL / FTS / script) or the tool from STEP 1c/1d.
- Display: call widget_display(name, params).
${actionTools.join('\n')}

Only use data returned by tools or given by the user. Never fabricate.
Reply: one-line summary + result.`;
    } else {
      // ── Default: lazy discovery via 3 global tools (allRecipes, allTools, get_recipe) ──
      // Gemma sees a minimal surface: server listings + 3 discovery globals + WebMCP action tools.
      // Everything else is fetched on-demand via allRecipes/allTools/get_recipe.
      const currentDateTime = new Date().toISOString();

      const mcpServersList = mcpLayers.map(l => {
        const slug = l.description || SERVER_SLUGS[l.serverName.toLowerCase()] || '';
        return `- ${l.serverName}${slug ? ` — ${slug}` : ''}`;
      }).join('\n') || '(none)';

      const webmcpServersList = webmcpLayers.map(l => {
        const slug = l.description || SERVER_SLUGS[l.serverName.toLowerCase()] || '';
        return `- ${l.serverName}${slug ? ` — ${slug}` : ''}`;
      }).join('\n') || '(none)';

      // 3 discovery globals (pseudo-tools hardcoded — not prefixed by server)
      const discoveryToolsDeclarations = [
        formatGemmaToolDeclaration({
          name: 'allRecipes',
          description: 'List recipe names + descriptions for a specific server (light, no body).',
          input_schema: {
            type: 'object',
            properties: { server: { type: 'string', description: 'Server name as listed above.' } },
            required: ['server'],
          },
        }),
        formatGemmaToolDeclaration({
          name: 'allTools',
          description: 'List ALL tools (with full input schemas) for a specific server.',
          input_schema: {
            type: 'object',
            properties: { server: { type: 'string', description: 'Server name as listed above.' } },
            required: ['server'],
          },
        }),
        formatGemmaToolDeclaration({
          name: 'get_recipe',
          description: 'Retrieve full body + instructions of a specific recipe on a specific server.',
          input_schema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Exact recipe name as returned by allRecipes.' },
              server: { type: 'string', description: 'Server name as listed above.' },
            },
            required: ['name', 'server'],
          },
        }),
      ].join('\n');

      // WebMCP action tools (widget_display, canvas, recall) — full schemas, prefixed.
      const webmcpToolsDeclarations = webmcpLayers.flatMap(l => {
        const prefix = `${sanitizeServerName(l.serverName)}_webmcp_`;
        const names = ['widget_display', 'canvas', 'recall'];
        return names
          .filter(n => l.tools.some(t => t.name === n))
          .map(n => providerToolsByName.get(`${prefix}${n}`))
          .filter((t): t is ProviderTool => !!t)
          .map(t => formatGemmaToolDeclaration(t));
      }).join('\n') || '(no display tools available)';

      prompt = `We are the ${currentDateTime}

You are an AI assistant that helps users by answering questions and completes tasks using recipes.

For EVERY new task or request or question, you MUST execute the following steps in exact order.

CRITICAL RULE: You MUST execute all steps silently. Do NOT generate or output any internal thoughts, reasoning, explanations, or intermediate text at ANY step.

You MUST answer the user using tools you call.

Recipes are PROCEDURES (markdown with SQL, scripts, or tool-call examples), NOT tools. To execute a recipe:
1. List recipes: call allRecipes(server)
2. Load the chosen recipe: call get_recipe(name, server) — returns full instructions
3. Follow the instructions: they tell you which DATA tools to call. If you need a tool's schema, call allTools(server)
4. Render the result: call widget_display if the user wants a visual

Never call a recipe name as a tool. Never fabricate data — only use data returned by an actual tool call.

There are two kind of servers: MCP servers for DATA retrieval and WebMCP servers for UI display.

Outside of tool calling e.g. greetings or small talk, or if tool calling fails, reply directly in a chat.

Currently connected MCP servers (DATA):

${mcpServersList}

MCP tools (call with a specific server name to explore):

${discoveryToolsDeclarations}

Currently connected WebMCP servers (UI display):

${webmcpServersList}

WebMCP tools (full schemas — always callable to render on canvas):

${webmcpToolsDeclarations}`;
    }
  } else {
    // ── Existing generic template for Claude/remote — DO NOT MODIFY ──
    const reasoningRule = 'Do not narrate your process in the response. Internal reasoning is permitted but must not appear in the final output.';

    prompt = `You are an AI assistant that helps users by answering their questions and completing tasks using recipes (also called skills) — instructions for an AI agent with scripts, schemas, and information. If no recipe or tool fits, fall back to a traditional chat (STEP 5).

CRITICAL RULE: ${reasoningRule}

STEP 1 — List all recipes

Call one of these tools to list available recipes:

${listRecipes.join('\n')}

If at least one relevant recipe is found → go to STEP 2.
If no results → go to STEP 1b.

STEP 1b — Search recipes

Search recipes (fallback from STEP 1):

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
The id comes from the result of list_recipes (STEP 1) or search_recipes (STEP 1b), whichever was called.

Read the full instructions of the selected recipe.

STEP 3 — Execute

Prefer recipes over direct tool calls when a recipe matches the task. Use low-level tools (DB queries, schema introspection, raw scripts) only when invoked from within a recipe's instructions.

Follow the recipe instructions exactly if you have one. Otherwise use the tools directly.

Output format: (1) a one-sentence summary of the action performed, then (2) the result. Nothing else.

STEP 4 — UI display

Unless a recipe specifies otherwise, use these tools to display your responses on the canvas:

${actionTools.join('\n')}

widget_display requires data from a DATA tool call made earlier in this session. Without such data, reply in plain text instead of displaying. Never fabricate IDs, URLs, names, dates, or content not returned by a tool.

STEP 5 — Plain chat (no tools)

Use when: (a) the request is a greeting / small talk, (b) no recipe or tool fits, (c) previous steps failed to yield a match.`;
  }

  // Note: for Gemma (kind === 'gemma'), tool declarations are emitted INLINE at each
  // STEP via `fmtToolRef(..., kind, tool)` — no appendix is appended here.

  return { prompt, aliasMap };
}

/** Build system prompt — backward-compatible wrapper that returns a plain string.
 *  Also populates the deprecated global toolAliasMap for legacy consumers.
 *  For parallel-safe usage, use buildSystemPromptWithAliases() instead.
 */
export function buildSystemPrompt(layers: ToolLayer[], options?: { providerKind?: ProviderKind; template?: string }): string {
  const { prompt, aliasMap } = buildSystemPromptWithAliases(layers, options);

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
