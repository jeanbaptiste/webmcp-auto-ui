// ToolLayer types — structured layers for the agent loop

import type { McpToolDef } from './types.js';
import type { Recipe, McpRecipe } from './recipes/types.js';

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
  recipes?: Recipe[];
}

export type ToolLayer = McpLayer | UILayer;
