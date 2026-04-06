// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — WebMCP helpers
// Thin layer on top of polyfill.ts: skill registry + result builders.
// Zero additional dependencies. SSR-safe.
// ---------------------------------------------------------------------------

import { executeToolInternal } from './polyfill.js';
import type { ModelContextTool, ToolExecuteCallback, ToolExecuteResult } from './types.js';

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

export function textResult(text: string): ToolExecuteResult {
  return { content: [{ type: 'text', text }] };
}

export function jsonResult(data: unknown): ToolExecuteResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// ---------------------------------------------------------------------------
// Skill registry
// ---------------------------------------------------------------------------

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  component: string;
  presentation?: string;
  version?: string;
  tags?: string[];
}

const _skills = new Map<string, SkillDef>();

function mcNav(): {
  registerTool: (t: ModelContextTool & { execute: ToolExecuteCallback }) => void;
  unregisterTool: (name: string) => void;
} | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as unknown as Record<string, unknown>).modelContext as ReturnType<typeof mcNav> ?? null;
}

export function registerSkill(skill: SkillDef): void {
  _skills.set(skill.id, skill);
  const mc = mcNav();
  if (!mc) return;
  const toolName = `skill__${skill.id}`;
  try { mc.unregisterTool(toolName); } catch { /* not yet registered */ }
  mc.registerTool({
    name: toolName,
    description: `[Skill] ${skill.name} — ${skill.description}. Component: ${skill.component}.${skill.presentation ? ` Hints: ${skill.presentation}` : ''}`,
    inputSchema: { type: 'object', properties: {} },
    execute: () => jsonResult(skill),
    annotations: { readOnlyHint: true },
  });
}

export function unregisterSkill(id: string): void {
  _skills.delete(id);
  const mc = mcNav();
  if (!mc) return;
  try { mc.unregisterTool(`skill__${id}`); } catch { /* already gone */ }
}

export function getSkill(id: string): SkillDef | undefined {
  return _skills.get(id);
}

export function listSkills(): SkillDef[] {
  return Array.from(_skills.values());
}

export function clearSkills(): void {
  for (const id of Array.from(_skills.keys())) unregisterSkill(id);
}

export { executeToolInternal };
