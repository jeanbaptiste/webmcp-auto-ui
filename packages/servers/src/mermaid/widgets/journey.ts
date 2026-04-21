// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || 'User Journey';
  const sections = (data.sections as Array<{ name: string; tasks: Array<{ name: string; score: number; actors?: string[] }> }>) || [];
  let def = `journey\n  title ${title}\n`;
  for (const s of sections) {
    def += `  section ${s.name}\n`;
    for (const t of s.tasks) {
      const actors = t.actors ? `: ${t.actors.join(', ')}` : '';
      def += `    ${t.name}: ${t.score}${actors}\n`;
    }
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
