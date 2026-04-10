// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — WebMCP helpers
// Result builders for tool execute callbacks.
// Zero additional dependencies. SSR-safe.
//
// NOTE: The skill registry that used to live here (SkillDef, registerSkill,
// unregisterSkill, etc.) has been removed. The canonical skill type and
// registry now live in @webmcp-auto-ui/sdk (packages/sdk/src/skills/registry.ts).
// ---------------------------------------------------------------------------

import type { ToolExecuteResult } from './types.js';

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

export function textResult(text: string): ToolExecuteResult {
  return { content: [{ type: 'text', text }] };
}

export function jsonResult(data: unknown): ToolExecuteResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
