// ---------------------------------------------------------------------------
// pie-chart — Pie chart (Mermaid.js)
// Accepts raw `definition` or structured `title` + `slices`.
// ---------------------------------------------------------------------------

import { renderMermaid } from './shared.js';

interface PieSlice {
  label: string;
  value: number;
}

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;

  const title = data.title as string | undefined;
  const slices = (data.slices ?? []) as PieSlice[];
  const lines: string[] = [];

  lines.push(title ? `pie title ${title}` : 'pie');
  for (const s of slices) {
    lines.push(`  "${s.label}" : ${s.value}`);
  }

  return lines.join('\n');
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
