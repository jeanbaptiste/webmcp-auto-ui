// ---------------------------------------------------------------------------
// gantt — Gantt chart (Mermaid.js)
// Accepts raw `definition` or structured `title` + `sections`.
// ---------------------------------------------------------------------------

import { renderMermaid } from './shared.js';

interface GanttTask {
  name: string;
  start: string;
  duration: string;
  id?: string;
  status?: 'done' | 'active' | 'crit' | '';
}

interface GanttSection {
  name: string;
  tasks: GanttTask[];
}

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;

  const title = data.title as string | undefined;
  const dateFormat = (data.dateFormat as string) ?? 'YYYY-MM-DD';
  const sections = (data.sections ?? []) as GanttSection[];
  const lines: string[] = ['gantt'];

  if (title) lines.push(`  title ${title}`);
  lines.push(`  dateFormat ${dateFormat}`);

  for (const s of sections) {
    lines.push(`  section ${s.name}`);
    for (const t of s.tasks) {
      const parts: string[] = [];
      if (t.status) parts.push(t.status);
      if (t.id) parts.push(t.id);
      parts.push(t.start);
      parts.push(t.duration);
      lines.push(`    ${t.name} :${parts.join(', ')}`);
    }
  }

  return lines.join('\n');
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
