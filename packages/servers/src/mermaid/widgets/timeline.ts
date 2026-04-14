// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || '';
  const sections = (data.sections as Array<{ period: string; events: string[] }>) || [];
  let def = 'timeline\n';
  if (title) def += `  title ${title}\n`;
  for (const s of sections) {
    def += `  section ${s.period}\n`;
    for (const e of s.events) {
      def += `    ${e}\n`;
    }
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
