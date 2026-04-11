// ---------------------------------------------------------------------------
// mindmap — Mind map (Mermaid.js)
// Accepts raw `definition` or structured `root` + `children`.
// ---------------------------------------------------------------------------

import { renderMermaid } from './shared.js';

interface MindmapNode {
  label: string;
  children?: MindmapNode[];
}

function buildTree(node: MindmapNode, depth: number): string[] {
  const indent = '  '.repeat(depth);
  const lines: string[] = [`${indent}${node.label}`];
  for (const child of node.children ?? []) {
    lines.push(...buildTree(child, depth + 1));
  }
  return lines;
}

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;

  const rootLabel = data.root as string | undefined;
  const children = (data.children ?? []) as MindmapNode[];
  const lines: string[] = ['mindmap'];

  lines.push(`  root((${rootLabel ?? 'Root'}))`);
  for (const child of children) {
    lines.push(...buildTree(child, 2));
  }

  return lines.join('\n');
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
