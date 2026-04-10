// ToolLayer types — structured layers for the agent loop

import type { McpToolDef, AnthropicTool } from './types.js';
import type { Recipe, McpRecipe } from './recipes/types.js';
import type { ComponentAdapter } from './component-adapter.js';
import { sanitizeSchema } from '@webmcp-auto-ui/core';
import { UI_TOOLS } from './ui-tools.js';
import { LIST_COMPONENTS_TOOL, GET_COMPONENT_TOOL, COMPONENT_TOOL } from './component-tool.js';

/** MCP data layer — tools and recipes from a connected MCP server */
export interface McpLayer {
  source: 'mcp';
  serverUrl: string;
  serverName?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}

/** UI layer — component tool + WebMCP recipes */
export interface UILayer {
  source: 'ui';
  /** Optional adapter to filter/customize UI tools (explicit mode only) */
  adapter?: ComponentAdapter;
  recipes?: Recipe[];
}

export type ToolLayer = McpLayer | UILayer;

/** Convert McpToolDef[] to AnthropicTool[] (duplicated from loop.ts to avoid circular import) */
function mcpToolsToAnthropic(tools: McpToolDef[]): AnthropicTool[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description ?? t.name,
    input_schema: sanitizeSchema(
      (t.inputSchema ?? { type: 'object', properties: {} }) as import('@webmcp-auto-ui/core').JsonSchema
    ) as Record<string, unknown>,
  }));
}

/** Build AnthropicTool[] from structured layers */
export function buildToolsFromLayers(
  layers: ToolLayer[],
  toolMode: 'smart' | 'explicit' = 'smart',
): AnthropicTool[] {
  const tools: AnthropicTool[] = [];

  for (const layer of layers) {
    switch (layer.source) {
      case 'mcp':
        tools.push(...mcpToolsToAnthropic(layer.tools));
        break;
      case 'ui':
        if (toolMode === 'explicit') {
          // In explicit mode, use adapter's tools if provided, otherwise all UI_TOOLS
          if (layer.adapter) {
            tools.push(...layer.adapter.tools());
          } else {
            tools.push(...UI_TOOLS);
          }
        }
        // 3 UI tools always included (smart = only these, explicit = render_* + these)
        tools.push(LIST_COMPONENTS_TOOL, GET_COMPONENT_TOOL, COMPONENT_TOOL);
        break;
    }
  }

  return tools;
}
