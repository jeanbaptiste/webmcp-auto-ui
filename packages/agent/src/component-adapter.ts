/**
 * ComponentAdapter — registry of UI components the dev wants to expose to the LLM.
 *
 * Decouples tool definitions (what the LLM sees) from renderers (what the user sees).
 * Apps register only the components they need; the adapter produces the AnthropicTool[]
 * subset to send to the LLM.
 */

import type { AnthropicTool } from './types.js';
import { UI_TOOLS, TOOL_TO_BLOCK } from './ui-tools.js';

export interface ComponentDef {
  /** Block type: "stat", "chart", "table", etc. */
  type: string;
  /** Anthropic tool definition (name, description, schema) */
  tool: AnthropicTool;
  /** Optional Svelte renderer — if absent, native BlockRenderer is used */
  renderer?: unknown; // Component type from svelte, kept as unknown to avoid svelte dep
  /** Logical group for filtering */
  group?: 'simple' | 'rich' | 'canvas' | 'media' | 'advanced' | 'custom';
}

export class ComponentAdapter {
  private _defs = new Map<string, ComponentDef>();

  register(def: ComponentDef): this {
    this._defs.set(def.type, def);
    return this;
  }

  registerAll(defs: ComponentDef[]): this {
    for (const d of defs) this._defs.set(d.type, d);
    return this;
  }

  unregister(type: string): this {
    this._defs.delete(type);
    return this;
  }

  /** Tool definitions to send to the LLM (explicit mode only) */
  tools(): AnthropicTool[] {
    return Array.from(this._defs.values()).map(d => d.tool);
  }

  types(): string[] {
    return Array.from(this._defs.keys());
  }

  get(type: string): ComponentDef | undefined {
    return this._defs.get(type);
  }

  getRenderer(type: string): unknown | undefined {
    return this._defs.get(type)?.renderer;
  }

  byGroup(group: string): ComponentDef[] {
    return Array.from(this._defs.values()).filter(d => d.group === group);
  }

  get size(): number {
    return this._defs.size;
  }
}

// ── Presets ────────────────────────────────────────────────────────────────────

const TOOL_GROUPS: Record<string, string[]> = {
  simple: [
    'render_stat', 'render_kv', 'render_list', 'render_chart',
    'render_alert', 'render_code', 'render_text', 'render_actions', 'render_tags',
  ],
  rich: [
    'render_table', 'render_timeline', 'render_profile', 'render_trombinoscope',
    'render_json', 'render_hemicycle', 'render_chart_rich', 'render_cards',
    'render_sankey', 'render_log', 'render_stat_card', 'render_grid',
  ],
  media: [
    'render_gallery', 'render_carousel', 'render_map',
  ],
  advanced: [
    'render_d3', 'render_js_sandbox',
  ],
  canvas: [
    'clear_canvas', 'update_block', 'move_block', 'resize_block', 'style_block',
  ],
};

/** Convert tool name to block type, using the canonical TOOL_TO_BLOCK mapping */
function toolNameToType(name: string): string {
  // Use the canonical mapping from ui-tools (matches BlockRenderer's NATIVE_MAP)
  if (name in TOOL_TO_BLOCK) return TOOL_TO_BLOCK[name];
  // Canvas actions
  if (name === 'clear_canvas') return 'clear';
  if (name.endsWith('_block')) return name.replace('_block', '');
  return name;
}

/** Create ComponentDefs for the given groups of native tools */
export function nativePreset(...groups: string[]): ComponentDef[] {
  const toolNames = groups.flatMap(g => TOOL_GROUPS[g] ?? []);
  return UI_TOOLS
    .filter(t => toolNames.includes(t.name))
    .map(t => {
      const group = Object.entries(TOOL_GROUPS)
        .find(([, names]) => names.includes(t.name))?.[0] as ComponentDef['group'];
      return { type: toolNameToType(t.name), tool: t, group };
    });
}

/** All native components (simple + rich + media + advanced + canvas) */
export function allNativePreset(): ComponentDef[] {
  return nativePreset('simple', 'rich', 'media', 'advanced', 'canvas');
}

/** Minimal preset: stat, kv, chart, table, text + clear, update */
export function minimalPreset(): ComponentDef[] {
  const names = [
    'render_stat', 'render_kv', 'render_chart', 'render_table',
    'render_text', 'clear_canvas', 'update_block',
  ];
  return UI_TOOLS
    .filter(t => names.includes(t.name))
    .map(t => ({ type: toolNameToType(t.name), tool: t, group: 'simple' as const }));
}
