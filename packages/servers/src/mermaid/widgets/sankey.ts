// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const links = (data.links as Array<{ source: string; target: string; value: number }>) || [];
  let def = 'sankey-beta\n\n';
  for (const l of links) {
    def += `${l.source},${l.target},${l.value}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
