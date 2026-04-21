// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const groups = (data.groups as Array<{ id: string; label: string; icon?: string }>) || [];
  const services = (data.services as Array<{ id: string; label: string; icon?: string; inGroup?: string }>) || [];
  const edges = (data.edges as Array<{ from: string; to: string; direction: string }>) || [];
  let def = 'architecture-beta\n';
  for (const g of groups) {
    const icon = g.icon ? `(${g.icon})` : '';
    def += `  group ${g.id}${icon}[${g.label}]\n`;
  }
  for (const s of services) {
    const icon = s.icon ? `(${s.icon})` : '(server)';
    const inGroup = s.inGroup ? ` in ${s.inGroup}` : '';
    def += `  service ${s.id}${icon}[${s.label}]${inGroup}\n`;
  }
  for (const e of edges) {
    def += `  ${e.from}:${e.direction} --> ${e.to}:${e.direction}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
