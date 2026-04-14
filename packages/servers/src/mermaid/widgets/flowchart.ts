// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const direction = (data.direction as string) || 'TD';
  const nodes = (data.nodes as Array<{ id: string; label?: string; shape?: string }>) || [];
  const edges = (data.edges as Array<{ from: string; to: string; label?: string; style?: string }>) || [];
  let def = `flowchart ${direction}\n`;
  for (const n of nodes) {
    const label = n.label || n.id;
    const shape = n.shape || 'rect';
    if (shape === 'round') def += `  ${n.id}(${label})\n`;
    else if (shape === 'stadium') def += `  ${n.id}([${label}])\n`;
    else if (shape === 'diamond') def += `  ${n.id}{${label}}\n`;
    else if (shape === 'circle') def += `  ${n.id}((${label}))\n`;
    else if (shape === 'hexagon') def += `  ${n.id}{{${label}}}\n`;
    else def += `  ${n.id}[${label}]\n`;
  }
  for (const e of edges) {
    const arrow = e.style === 'dotted' ? '-.->' : e.style === 'thick' ? '==>' : '-->';
    const label = e.label ? `|${e.label}|` : '';
    def += `  ${e.from} ${arrow}${label} ${e.to}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
