// Collect per-layer prompt references (tool names formatted for the LLM).

import type { ProviderTool } from '../types.js';
import {
  buildToolsFromLayers,
  protocolToken,
  resolveCanonicalTools,
  sanitizeServerName,
  type McpLayer,
  type ProviderKind,
  type ToolLayer,
  type WebMcpLayer,
} from '../tool-layers.js';
import { formatGemmaToolDeclaration } from './gemma4-prompt-builder.js';

/** Short descriptions for discovery pseudo-tools (used in inline Gemma decls). */
const shortSearchToolsDesc = (serverName: string) =>
  `Search tools by keyword on the ${serverName} server.`;
const shortListToolsDesc = (serverName: string) =>
  `List ALL tools on the ${serverName} server.`;

/** First parameter name from a tool's input schema (for arg hints). */
function firstParamName(tool?: ProviderTool, fallback = 'query'): string {
  if (!tool?.input_schema) return fallback;
  const schema = tool.input_schema as Record<string, unknown>;
  const required = (schema.required as string[] | undefined) ?? [];
  if (required.length > 0) return required[0];
  const props = (schema.properties as Record<string, unknown> | undefined) ?? {};
  return Object.keys(props)[0] ?? fallback;
}

/** Format a tool reference for the system prompt (generic or inline Gemma decl). */
function fmtToolRef(
  prefixedName: string,
  args: string[] = [],
  kind: ProviderKind = 'generic',
  tool?: ProviderTool,
): string {
  if (kind === 'gemma' && tool) {
    return formatGemmaToolDeclaration({ ...tool, name: prefixedName });
  }
  if (kind === 'gemma' || kind === 'qwen' || kind === 'mistral') {
    return args.length ? `\`${prefixedName}(${args.join(', ')})\`` : `\`${prefixedName}\``;
  }
  return args.length ? `${prefixedName}(${args.join(', ')})` : `${prefixedName}()`;
}

export interface PromptRefs {
  searchRecipes: string[];
  listRecipes: string[];
  getRecipes: string[];
  searchTools: string[];
  listTools: string[];
  actionTools: string[];
  listRecipesByCat: { data: string[]; display: string[] };
  searchRecipesByCat: { data: string[]; display: string[] };
  getRecipesByCat: { data: string[]; display: string[] };
  aliasMap: Map<string, string>;
}

export function collectPromptRefs(
  layers: ToolLayer[],
  providerKind: ProviderKind,
): PromptRefs {
  const kind = providerKind;
  const mcpLayers = layers.filter((l): l is McpLayer => l.protocol === 'mcp');
  const webmcpLayers = layers.filter((l): l is WebMcpLayer => l.protocol === 'webmcp');

  const displayLayers = webmcpLayers.filter(l => l.tools.some(t => t.name === 'widget_display'));
  const dataLayers = layers.filter(l => !displayLayers.includes(l as WebMcpLayer));

  const providerToolsByName = new Map<string, ProviderTool>(
    buildToolsFromLayers(layers, { sanitize: true }).tools.map(t => [t.name, t]),
  );

  const aliasMap = new Map<string, string>();
  const searchRecipes: string[] = [];
  const listRecipes: string[] = [];
  const getRecipes: string[] = [];
  const searchTools: string[] = [];
  const listTools: string[] = [];

  for (const l of webmcpLayers) {
    const prefix = `${sanitizeServerName(l.serverName)}_ui_`;
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
    const searchToolsPseudo: ProviderTool = {
      name: `${prefix}search_tools`,
      description: shortSearchToolsDesc(l.serverName),
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Keyword to search for.' } }, required: ['query'] },
    };
    searchTools.push(fmtToolRef(`${prefix}search_tools`, ['query'], kind, searchToolsPseudo));
    const listToolsPseudo: ProviderTool = {
      name: `${prefix}list_tools`,
      description: shortListToolsDesc(l.serverName),
      input_schema: { type: 'object', properties: {} },
    };
    listTools.push(fmtToolRef(`${prefix}list_tools`, [], kind, listToolsPseudo));
  }

  for (const l of mcpLayers) {
    const prefix = `${sanitizeServerName(l.serverName)}_data_`;
    const matches = resolveCanonicalTools(l.tools);

    for (const m of matches) {
      const canonicalPrefixed = `${prefix}${m.role}`;
      const realPrefixed = `${prefix}${m.realToolName}`;

      if (m.role !== m.realToolName) {
        aliasMap.set(canonicalPrefixed, realPrefixed);
      }

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

    const searchToolsPseudo: ProviderTool = {
      name: `${prefix}search_tools`,
      description: shortSearchToolsDesc(l.serverName),
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Keyword to search for.' } }, required: ['query'] },
    };
    searchTools.push(fmtToolRef(`${prefix}search_tools`, ['query'], kind, searchToolsPseudo));
    const listToolsPseudo: ProviderTool = {
      name: `${prefix}list_tools`,
      description: shortListToolsDesc(l.serverName),
      input_schema: { type: 'object', properties: {} },
    };
    listTools.push(fmtToolRef(`${prefix}list_tools`, [], kind, listToolsPseudo));
  }

  const actionTools: string[] = [];
  const ACTION_NAMES = ['widget_display', 'canvas', 'recall'];
  for (const l of webmcpLayers) {
    const prefix = `${sanitizeServerName(l.serverName)}_ui_`;
    for (const actionName of ACTION_NAMES) {
      if (l.tools.some(t => t.name === actionName)) {
        const prefixedName = `${prefix}${actionName}`;
        const toolDef = providerToolsByName.get(prefixedName);
        const args = actionName === 'widget_display' ? ['name', 'params'] : [];
        actionTools.push(fmtToolRef(prefixedName, args, kind, toolDef));
      }
    }
  }

  const dataPrefixes = new Set(dataLayers.map(l => `${sanitizeServerName(l.serverName)}_${protocolToken(l.protocol)}_`));
  const displayPrefixes = new Set(displayLayers.map(l => `${sanitizeServerName(l.serverName)}_ui_`));
  void dataPrefixes;

  function splitByCategory(refs: string[]): { data: string[]; display: string[] } {
    const data: string[] = [];
    const display: string[] = [];
    for (const ref of refs) {
      const isDisplay = [...displayPrefixes].some(p => ref.includes(p));
      if (isDisplay) display.push(ref);
      else data.push(ref);
    }
    return { data, display };
  }

  return {
    searchRecipes,
    listRecipes,
    getRecipes,
    searchTools,
    listTools,
    actionTools,
    listRecipesByCat: splitByCategory(listRecipes),
    searchRecipesByCat: splitByCategory(searchRecipes),
    getRecipesByCat: splitByCategory(getRecipes),
    aliasMap,
  };
}
