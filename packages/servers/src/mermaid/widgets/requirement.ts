// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const requirements = (data.requirements as Array<{ id: string; name: string; text?: string; risk?: string; verifyMethod?: string }>) || [];
  const elements = (data.elements as Array<{ name: string; type?: string; docRef?: string }>) || [];
  const relations = (data.relations as Array<{ from: string; to: string; type: string }>) || [];
  let def = 'requirementDiagram\n';
  for (const r of requirements) {
    def += `  requirement ${r.name} {\n`;
    def += `    id: ${r.id}\n`;
    if (r.text) def += `    text: ${r.text}\n`;
    if (r.risk) def += `    risk: ${r.risk}\n`;
    if (r.verifyMethod) def += `    verifymethod: ${r.verifyMethod}\n`;
    def += '  }\n';
  }
  for (const e of elements) {
    def += `  element ${e.name} {\n`;
    if (e.type) def += `    type: ${e.type}\n`;
    if (e.docRef) def += `    docRef: ${e.docRef}\n`;
    def += '  }\n';
  }
  for (const r of relations) {
    def += `  ${r.from} - ${r.type} -> ${r.to}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
