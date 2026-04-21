// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || '';
  const dateFormat = (data.dateFormat as string) || 'YYYY-MM-DD';
  const sections = (data.sections as Array<{ name: string; tasks: Array<{ name: string; start: string; duration: string; status?: string }> }>) || [];
  let def = 'gantt\n';
  if (title) def += `  title ${title}\n`;
  def += `  dateFormat ${dateFormat}\n`;
  for (const s of sections) {
    def += `  section ${s.name}\n`;
    for (const t of s.tasks) {
      const status = t.status ? `${t.status}, ` : '';
      def += `    ${t.name} : ${status}${t.start}, ${t.duration}\n`;
    }
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
