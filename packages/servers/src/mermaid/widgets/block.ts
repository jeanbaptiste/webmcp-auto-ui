// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const columns = (data.columns as number) || 3;
  const blocks = (data.blocks as Array<{ id: string; label?: string; width?: number }>) || [];
  const links = (data.links as Array<{ from: string; to: string; label?: string }>) || [];
  let def = `block-beta\n  columns ${columns}\n`;
  for (const b of blocks) {
    const label = b.label || b.id;
    const width = b.width ? `:${b.width}` : '';
    def += `  ${b.id}["${label}"]${width}\n`;
  }
  for (const l of links) {
    const label = l.label ? `-- "${l.label}" -->` : '-->';
    def += `  ${l.from} ${label} ${l.to}\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
