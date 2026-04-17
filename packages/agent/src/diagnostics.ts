// Diagnostics — runtime analysis of tool layers, schemas and prompt consistency

import type { ToolLayer } from './tool-layers.js';
import type { ProviderTool } from './types.js';
import { sanitizeServerName } from './tool-layers.js';
import { sanitizeSchemaWithReport } from '@webmcp-auto-ui/core';
import type { JsonSchema } from '@webmcp-auto-ui/core';

export interface Diagnostic {
  severity: 'error' | 'warning';
  title: string;
  detail: string;
  quickFix?: string;
  codeFix?: string;
}

/**
 * Analyze layers + tools + prompt and return diagnostics.
 * Pure function — no side-effects.
 */
export function runDiagnostics(
  layers: ToolLayer[],
  tools: ProviderTool[],
  systemPrompt: string,
  schemaOptions?: { sanitize?: boolean; flatten?: boolean; strict?: boolean },
  /** Original (pre-sanitize) tools — used for check #5 to detect patchable schemas */
  rawTools?: ProviderTool[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // 1. Tool name hygiene — check for residual "mcp"/"server" noise in prefixes
  for (const layer of layers) {
    const prefix = sanitizeServerName(layer.serverName);
    const segments = prefix.split('_');
    const noise = segments.filter(s => ['mcp', 'server', 'srv'].includes(s));
    if (noise.length > 0) {
      diagnostics.push({
        severity: 'error',
        title: `Bruit dans le prefixe "${prefix}"`,
        detail: `Le serveur "${layer.serverName}" produit un prefixe contenant "${noise.join(', ')}". Les outils auront des noms ambigus comme ${prefix}_mcp_list_recipes.`,
        quickFix: `Ajoutez au system prompt:\n"Note: le serveur ${layer.serverName} utilise le prefixe '${prefix}'. Utilisez ${prefix}_mcp_<tool> ou ${prefix}_webmcp_<tool>."`,
        codeFix: `Renommer le serveur MCP cote serveur pour ne pas inclure "mcp"/"server" dans le nom.`,
      });
    }
  }

  // 2. Duplicate prefixes — two servers producing the same sanitized prefix
  const prefixMap = new Map<string, string[]>();
  for (const layer of layers) {
    const prefix = sanitizeServerName(layer.serverName);
    if (!prefixMap.has(prefix)) prefixMap.set(prefix, []);
    prefixMap.get(prefix)!.push(layer.serverName);
  }
  for (const [prefix, servers] of prefixMap) {
    if (servers.length > 1) {
      diagnostics.push({
        severity: 'error',
        title: `Collision de prefixe "${prefix}"`,
        detail: `Les serveurs ${servers.map(s => `"${s}"`).join(' et ')} produisent le meme prefixe "${prefix}". Les outils vont s'ecraser mutuellement.`,
        codeFix: `Renommer un des serveurs pour qu'ils aient des prefixes distincts.`,
      });
    }
  }

  // 3. Schema depth warning for Gemma when flatten is OFF
  if (schemaOptions && !schemaOptions.flatten) {
    for (const tool of tools) {
      const schema = tool.input_schema as Record<string, unknown>;
      if (hasNestedObjects(schema)) {
        diagnostics.push({
          severity: 'warning',
          title: `Schema imbrique: ${tool.name}`,
          detail: `L'outil "${tool.name}" a des proprietes de type "object" imbriquees. Les petits LLM (Gemma) peuvent avoir du mal a produire la structure correcte.`,
          quickFix: `Activez "Flatten" dans les parametres Schema LLM pour aplatir les objets imbriques.`,
          codeFix: `Simplifier le schema de l'outil cote serveur, ou activer schemaOptions.flatten.`,
        });
      }
    }
  }

  // 4. Prompt references non-existent tools
  // Include discovery tools (search_tools, list_tools) which are generated dynamically
  const toolNames = new Set(tools.map(t => t.name));
  for (const layer of layers) {
    const prefix = `${sanitizeServerName(layer.serverName)}_${layer.protocol}_`;
    toolNames.add(`${prefix}search_tools`);
    toolNames.add(`${prefix}list_tools`);
    toolNames.add(`${prefix}search_recipes`);
    toolNames.add(`${prefix}list_recipes`);
    toolNames.add(`${prefix}get_recipe`);
  }
  const toolPattern = /\b([a-z][a-z0-9_]{2,})_(mcp|webmcp)_([a-z][a-z0-9_]+)\b/g;
  let match;
  while ((match = toolPattern.exec(systemPrompt)) !== null) {
    const fullName = match[0];
    if (!toolNames.has(fullName)) {
      diagnostics.push({
        severity: 'warning',
        title: `Outil inconnu dans le prompt`,
        detail: `Le system prompt reference "${fullName}" mais cet outil n'existe pas dans les outils enregistres.`,
        quickFix: `Supprimez ou corrigez la reference "${fullName}" dans le system prompt.`,
      });
    }
  }

  // 5. Strict mode — schemas that were auto-patched
  // Must run on raw (pre-sanitize) schemas; sanitized tools will never show patches.
  const checkTools = rawTools ?? tools;
  for (const tool of checkTools) {
    const { patches } = sanitizeSchemaWithReport(tool.input_schema as JsonSchema);
    if (patches.length > 0) {
      diagnostics.push({
        severity: 'warning',
        title: `Schema patched: ${tool.name}`,
        detail: `${patches.length} correction(s) for strict mode: ${patches.map(p => p.path).join(', ')}. additionalProperties: false added automatically.`,
        codeFix: `Add "additionalProperties": false to the MCP server schema for ${tool.name}.`,
      });
    }
  }

  return diagnostics;
}

/** Check if a JSON schema has nested object properties (depth > 1) */
function hasNestedObjects(schema: Record<string, unknown>): boolean {
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props) return false;
  for (const prop of Object.values(props)) {
    if (prop && prop.type === 'object' && prop.properties) return true;
  }
  return false;
}
