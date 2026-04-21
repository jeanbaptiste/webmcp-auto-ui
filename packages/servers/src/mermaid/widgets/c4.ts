// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || '';
  const persons = (data.persons as Array<{ alias: string; name: string; description?: string }>) || [];
  const systems = (data.systems as Array<{ alias: string; name: string; description?: string; external?: boolean }>) || [];
  const relations = (data.relations as Array<{ from: string; to: string; label: string; technology?: string }>) || [];
  let def = 'C4Context\n';
  if (title) def += `  title ${title}\n`;
  for (const p of persons) {
    def += `  Person(${p.alias}, "${p.name}"${p.description ? `, "${p.description}"` : ''})\n`;
  }
  for (const s of systems) {
    const fn = s.external ? 'System_Ext' : 'System';
    def += `  ${fn}(${s.alias}, "${s.name}"${s.description ? `, "${s.description}"` : ''})\n`;
  }
  for (const r of relations) {
    def += `  Rel(${r.from}, ${r.to}, "${r.label}"${r.technology ? `, "${r.technology}"` : ''})\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
