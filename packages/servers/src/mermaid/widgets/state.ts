// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const states = (data.states as string[]) || [];
  const transitions = (data.transitions as Array<{ from: string; to: string; label?: string }>) || [];
  let def = 'stateDiagram-v2\n';
  for (const s of states) {
    def += `  ${s}\n`;
  }
  for (const t of transitions) {
    const label = t.label ? ` : ${t.label}` : '';
    def += `  ${t.from} --> ${t.to}${label}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
