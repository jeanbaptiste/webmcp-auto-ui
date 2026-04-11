// ---------------------------------------------------------------------------
// flowchart — Directed graph / flowchart (Mermaid.js)
// Accepts raw `definition` or structured `nodes` + `edges`.
// ---------------------------------------------------------------------------

import { renderMermaid } from './shared.js';

interface FlowNode {
  id: string;
  label?: string;
  shape?: 'rect' | 'round' | 'stadium' | 'diamond' | 'circle' | 'hexagon';
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

const shapeWrap: Record<string, [string, string]> = {
  rect:     ['[', ']'],
  round:    ['(', ')'],
  stadium:  ['([', '])'],
  diamond:  ['{', '}'],
  circle:   ['((', '))'],
  hexagon:  ['{{', '}}'],
};

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;

  const dir = (data.direction as string) ?? 'TD';
  const nodes = (data.nodes ?? []) as FlowNode[];
  const edges = (data.edges ?? []) as FlowEdge[];
  const lines: string[] = [`graph ${dir}`];

  for (const n of nodes) {
    const [open, close] = shapeWrap[n.shape ?? 'rect'] ?? shapeWrap.rect;
    lines.push(`  ${n.id}${open}${n.label ?? n.id}${close}`);
  }

  for (const e of edges) {
    const arrow = e.label ? `-->|${e.label}|` : '-->';
    lines.push(`  ${e.from} ${arrow} ${e.to}`);
  }

  return lines.join('\n');
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
