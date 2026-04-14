// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const participants = (data.participants as string[]) || [];
  const messages = (data.messages as Array<{ from: string; to: string; method: string; returnType?: string }>) || [];
  let def = 'zenuml\n';
  for (const m of messages) {
    if (m.returnType) {
      def += `  ${m.returnType} = ${m.from}.${m.method}\n`;
    } else {
      def += `  ${m.from}.${m.method}\n`;
    }
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
