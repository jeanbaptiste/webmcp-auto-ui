// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const classes = (data.classes as Array<{ name: string; members?: string[]; methods?: string[] }>) || [];
  const relations = (data.relations as Array<{ from: string; to: string; type?: string; label?: string }>) || [];
  let def = 'classDiagram\n';
  for (const c of classes) {
    def += `  class ${c.name} {\n`;
    for (const m of c.members || []) def += `    ${m}\n`;
    for (const m of c.methods || []) def += `    ${m}()\n`;
    def += '  }\n';
  }
  for (const r of relations) {
    const arrow = r.type === 'inheritance' ? '<|--' : r.type === 'composition' ? '*--' : r.type === 'aggregation' ? 'o--' : '-->';
    const label = r.label ? ` : ${r.label}` : '';
    def += `  ${r.from} ${arrow} ${r.to}${label}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
