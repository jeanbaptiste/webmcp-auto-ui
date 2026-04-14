// @ts-nocheck
import { renderMermaid } from './shared.js';

interface MindmapNode {
  label: string;
  children?: MindmapNode[];
  shape?: string;
}

function renderNode(node: MindmapNode, indent: number): string {
  const prefix = '  '.repeat(indent);
  let line: string;
  const shape = node.shape || 'default';
  if (shape === 'circle') line = `${prefix}((${node.label}))`;
  else if (shape === 'bang') line = `${prefix})${node.label}(`;
  else if (shape === 'cloud') line = `${prefix})${node.label}(`;
  else if (shape === 'hexagon') line = `${prefix}{{${node.label}}}`;
  else line = `${prefix}${node.label}`;
  let result = line + '\n';
  for (const child of node.children || []) {
    result += renderNode(child, indent + 1);
  }
  return result;
}

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const root = data.root as MindmapNode;
  if (!root) return 'mindmap\n  root\n';
  let def = 'mindmap\n';
  def += renderNode(root, 1);
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
