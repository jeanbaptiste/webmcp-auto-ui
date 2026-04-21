// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const participants = (data.participants as string[]) || [];
  const messages = (data.messages as Array<{ from: string; to: string; text: string; type?: string }>) || [];
  let def = 'sequenceDiagram\n';
  for (const p of participants) {
    def += `  participant ${p}\n`;
  }
  for (const m of messages) {
    const arrow = m.type === 'dotted' ? '-->>' : m.type === 'solid' ? '->>' : '->>';
    def += `  ${m.from}${arrow}${m.to}: ${m.text}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
