// ---------------------------------------------------------------------------
// er-diagram — Entity-Relationship diagram (Mermaid.js)
// Accepts raw `definition` or structured `entities` + `relationships`.
// ---------------------------------------------------------------------------

import { renderMermaid } from './shared.js';

interface ERAttribute {
  type: string;
  name: string;
  key?: 'PK' | 'FK' | '';
}

interface EREntity {
  name: string;
  attributes?: ERAttribute[];
}

interface ERRelationship {
  from: string;
  to: string;
  cardinality: string;
  label: string;
}

const cardinalityMap: Record<string, string> = {
  'one-to-one':    '||--||',
  'one-to-many':   '||--o{',
  'many-to-one':   '}o--||',
  'many-to-many':  '}o--o{',
  'zero-to-one':   '|o--||',
  'zero-to-many':  '|o--o{',
};

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;

  const entities = (data.entities ?? []) as EREntity[];
  const relationships = (data.relationships ?? []) as ERRelationship[];
  const lines: string[] = ['erDiagram'];

  for (const rel of relationships) {
    const card = cardinalityMap[rel.cardinality] ?? '||--o{';
    lines.push(`  ${rel.from} ${card} ${rel.to} : "${rel.label}"`);
  }

  for (const e of entities) {
    if (e.attributes && e.attributes.length > 0) {
      lines.push(`  ${e.name} {`);
      for (const a of e.attributes) {
        const suffix = a.key ? ` ${a.key}` : '';
        lines.push(`    ${a.type} ${a.name}${suffix}`);
      }
      lines.push('  }');
    }
  }

  return lines.join('\n');
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
