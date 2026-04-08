/**
 * Unified `component` tool — discovery + render via a single tool.
 *
 * Coexists with the individual render_* tools; both are valid.
 *
 * Usage (from the LLM side):
 *   component("help")                     → list all components
 *   component("help", "stat-card")        → schema of stat-card
 *   component("stat-card", { label: … })  → render stat-card
 */

import { UI_TOOLS, executeUITool } from './ui-tools.js';
import type { AnthropicTool, AgentCallbacks } from './types.js';

// ── Registry ─────────────────────────────────────────────────────────────────

export interface ComponentEntry {
  /** Short name without render_ prefix (e.g. "stat-card") */
  name: string;
  /** Original tool name (e.g. "render_stat_card") */
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Map<shortName, ComponentEntry> — mutable so apps can register custom components */
export const componentRegistry = new Map<string, ComponentEntry>();

// Populate from UI_TOOLS
for (const tool of UI_TOOLS) {
  let shortName: string;

  if (tool.name.startsWith('render_')) {
    // render_stat_card → stat-card
    shortName = tool.name.slice('render_'.length).replace(/_/g, '-');
  } else if (tool.name === 'clear_canvas') {
    shortName = 'clear';
  } else if (tool.name === 'update_block') {
    shortName = 'update';
  } else if (tool.name === 'move_block') {
    shortName = 'move';
  } else if (tool.name === 'resize_block') {
    shortName = 'resize';
  } else if (tool.name === 'style_block') {
    shortName = 'style';
  } else {
    shortName = tool.name;
  }

  const entry: ComponentEntry = {
    name: shortName,
    toolName: tool.name,
    description: tool.description,
    inputSchema: tool.input_schema,
  };

  componentRegistry.set(shortName, entry);
  // Also register with the original tool name for back-compat
  if (shortName !== tool.name) {
    componentRegistry.set(tool.name, entry);
  }
}

// ── Tool definition ──────────────────────────────────────────────────────────

export const COMPONENT_TOOL: AnthropicTool = {
  name: 'component',
  description:
    'Unified UI component tool. Call component("help") for the list of available components, ' +
    'component("help", "component_name") for the schema, or component("component_name", {...params}) to render.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "Component name (e.g. 'stat-card') or 'help'.",
      },
      params: {
        description:
          "Component parameters (object) when rendering, or component name (string) when requesting help for a specific component.",
      },
    },
    required: ['name'],
  },
};

// ── Execution ────────────────────────────────────────────────────────────────

export function executeComponent(
  args: { name: string; params?: unknown },
  callbacks: AgentCallbacks,
): string {
  // ── Help mode ────────────────────────────────────────────────────────────
  if (args.name === 'help') {
    if (typeof args.params === 'string') {
      const comp = componentRegistry.get(args.params);
      if (!comp) {
        return JSON.stringify({ error: `Unknown component: ${args.params}. Call component("help") for the list.` });
      }
      return JSON.stringify({
        name: comp.name,
        description: comp.description,
        schema: comp.inputSchema,
      });
    }
    // List all unique components (skip alias entries that share the same ComponentEntry)
    const seen = new Set<ComponentEntry>();
    const list: { name: string; description: string }[] = [];
    for (const entry of componentRegistry.values()) {
      if (seen.has(entry)) continue;
      seen.add(entry);
      list.push({ name: entry.name, description: entry.description });
    }
    return JSON.stringify(list);
  }

  // ── Render mode ──────────────────────────────────────────────────────────
  const comp = componentRegistry.get(args.name);
  if (!comp) {
    return JSON.stringify({ error: `Unknown component: ${args.name}. Call component("help") for the list.` });
  }
  return executeUITool(
    comp.toolName,
    (args.params as Record<string, unknown>) ?? {},
    callbacks,
  );
}
