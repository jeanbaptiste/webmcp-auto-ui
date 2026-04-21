// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const commits = (data.commits as Array<{ message?: string; tag?: string; type?: string }>) || [];
  const branches = (data.branches as Array<{ name: string; from?: string }>) || [];
  const merges = (data.merges as Array<{ from: string; to?: string }>) || [];
  let def = 'gitGraph\n';
  for (const action of (data.actions as Array<{ type: string; [key: string]: unknown }>) || []) {
    switch (action.type) {
      case 'commit': {
        let line = '  commit';
        if (action.message) line += ` id: "${action.message}"`;
        if (action.tag) line += ` tag: "${action.tag}"`;
        if (action.commitType) line += ` type: ${action.commitType}`;
        def += line + '\n';
        break;
      }
      case 'branch':
        def += `  branch ${action.name}\n`;
        break;
      case 'checkout':
        def += `  checkout ${action.name}\n`;
        break;
      case 'merge':
        def += `  merge ${action.name}\n`;
        break;
    }
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
