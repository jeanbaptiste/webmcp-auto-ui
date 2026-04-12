// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || '';
  const showData = data.showData !== false;
  const slices = (data.slices as Array<{ label: string; value: number }>) || [];
  let def = 'pie';
  if (showData) def += ' showData';
  def += '\n';
  if (title) def += `  title ${title}\n`;
  for (const s of slices) {
    def += `  "${s.label}" : ${s.value}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
