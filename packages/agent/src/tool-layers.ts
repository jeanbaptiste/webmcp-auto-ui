// ToolLayer types — structured layers for the agent loop

import type { McpToolDef, AnthropicTool } from './types.js';
import type { Recipe, McpRecipe } from './recipes/types.js';
import type { ComponentAdapter } from './component-adapter.js';
import { sanitizeSchema } from '@webmcp-auto-ui/core';
import { GET_COMPONENT_TOOL, COMPONENT_TOOL } from './component-tool.js';
import { buildSkillTool } from './skill-executor.js';

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
  /** Optional adapter to filter/customize UI tools */
  adapter?: ComponentAdapter;
  recipes?: Recipe[];
}

/** Skill layer — predefined workflows/skills */
export interface SkillLayer {
  source: 'skill';
  skills: SkillEntry[];
}

export interface SkillEntry {
  id: string;
  name: string;
  description: string;
  mcpUrl?: string;
  mcpName?: string;
  expectedBlocks?: string[];
  tags?: string[];
}

export type ToolLayer = McpLayer | UILayer | SkillLayer;

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
): AnthropicTool[] {
  const tools: AnthropicTool[] = [];

  for (const layer of layers) {
    switch (layer.source) {
      case 'mcp':
        tools.push(...mcpToolsToAnthropic(layer.tools));
        break;
      case 'ui':
        tools.push(GET_COMPONENT_TOOL, COMPONENT_TOOL);
        break;
      case 'skill': {
        if (layer.skills.length > 0) {
          tools.push(buildSkillTool(layer.skills));
        }
        break;
      }
    }
  }

  // Deduplicate by tool name (last-wins if two layers define the same tool)
  const seen = new Map<string, AnthropicTool>();
  for (const tool of tools) {
    seen.set(tool.name, tool);
  }
  return Array.from(seen.values());
}
