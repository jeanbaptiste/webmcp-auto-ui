// ---------------------------------------------------------------------------
// class-diagram — UML class diagram (Mermaid.js)
// Accepts raw `definition` or structured `classes` + `relations`.
// ---------------------------------------------------------------------------

import { renderMermaid } from './shared.js';

interface ClassDef {
  name: string;
  members?: string[];
  methods?: string[];
}

interface ClassRelation {
  from: string;
  to: string;
  type: string;
  label?: string;
}

const relationArrow: Record<string, string> = {
  inheritance:  '<|--',
  composition:  '*--',
  aggregation:  'o--',
  association:  '-->',
  dependency:   '..>',
};

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;

  const classes = (data.classes ?? []) as ClassDef[];
  const relations = (data.relations ?? []) as ClassRelation[];
  const lines: string[] = ['classDiagram'];

  for (const c of classes) {
    lines.push(`  class ${c.name} {`);
    for (const m of c.members ?? []) {
      lines.push(`    ${m}`);
    }
    for (const m of c.methods ?? []) {
      lines.push(`    ${m}`);
    }
    lines.push('  }');
  }

  for (const r of relations) {
    const arrow = relationArrow[r.type] ?? '-->';
    const label = r.label ? ` : ${r.label}` : '';
    lines.push(`  ${r.from} ${arrow} ${r.to}${label}`);
  }

  return lines.join('\n');
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
