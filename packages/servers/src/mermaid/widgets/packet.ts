// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || '';
  const rows = (data.rows as Array<Array<{ start: number; end: number; label: string }>>) || [];
  let def = 'packet-beta\n';
  if (title) def += `  title ${title}\n`;
  for (const row of rows) {
    for (const field of row) {
      def += `  ${field.start}-${field.end}: "${field.label}"\n`;
    }
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
