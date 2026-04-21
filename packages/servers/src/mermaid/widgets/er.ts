// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const entities = (data.entities as Array<{ name: string; attributes?: Array<{ type: string; name: string }> }>) || [];
  const relations = (data.relations as Array<{ from: string; to: string; fromCardinality: string; toCardinality: string; label: string }>) || [];
  let def = 'erDiagram\n';
  for (const e of entities) {
    def += `  ${e.name} {\n`;
    for (const a of e.attributes || []) {
      def += `    ${a.type} ${a.name}\n`;
    }
    def += '  }\n';
  }
  for (const r of relations) {
    def += `  ${r.from} ${r.fromCardinality}--${r.toCardinality} ${r.to} : "${r.label}"\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
