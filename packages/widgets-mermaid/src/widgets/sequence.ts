// ---------------------------------------------------------------------------
// sequence — Sequence diagram (Mermaid.js)
// Accepts raw `definition` or structured `participants` + `messages`.
// ---------------------------------------------------------------------------

import { renderMermaid } from './shared.js';

interface Participant {
  name: string;
  alias?: string;
}

interface Message {
  from: string;
  to: string;
  text: string;
  type?: 'sync' | 'async' | 'reply' | 'note';
}

const arrowMap: Record<string, string> = {
  sync:  '->>',
  async: '-)',
  reply: '-->>',
  note:  '->>',  // notes handled separately
};

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;

  const participants = (data.participants ?? []) as Participant[];
  const messages = (data.messages ?? []) as Message[];
  const lines: string[] = ['sequenceDiagram'];

  for (const p of participants) {
    if (p.alias) {
      lines.push(`  participant ${p.alias} as ${p.name}`);
    } else {
      lines.push(`  participant ${p.name}`);
    }
  }

  // Build lookup: name -> alias (if any)
  const aliasOf = new Map<string, string>();
  for (const p of participants) {
    if (p.alias) aliasOf.set(p.name, p.alias);
  }
  const resolve = (name: string) => aliasOf.get(name) ?? name;

  for (const m of messages) {
    const arrow = arrowMap[m.type ?? 'sync'] ?? '->>';
    lines.push(`  ${resolve(m.from)}${arrow}${resolve(m.to)}: ${m.text}`);
  }

  return lines.join('\n');
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
