// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const columns = (data.columns as Array<{ title: string; items: string[] }>) || [];
  let def = 'kanban\n';
  for (const col of columns) {
    def += `  ${col.title}\n`;
    for (const item of col.items) {
      def += `    ${item}\n`;
    }
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
