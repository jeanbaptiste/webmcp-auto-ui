// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || '';
  const xAxis = data.xAxis as { label?: string; values: string[] } | undefined;
  const yAxis = data.yAxis as { label?: string; min?: number; max?: number } | undefined;
  const series = (data.series as Array<{ type: 'bar' | 'line'; data: number[] }>) || [];
  let def = 'xychart-beta\n';
  if (title) def += `  title "${title}"\n`;
  if (xAxis) {
    const label = xAxis.label ? ` "${xAxis.label}"` : '';
    def += `  x-axis${label} [${xAxis.values.map(v => `"${v}"`).join(', ')}]\n`;
  }
  if (yAxis) {
    const label = yAxis.label ? ` "${yAxis.label}"` : '';
    const range = yAxis.min !== undefined && yAxis.max !== undefined ? ` ${yAxis.min} --> ${yAxis.max}` : '';
    def += `  y-axis${label}${range}\n`;
  }
  for (const s of series) {
    def += `  ${s.type} [${s.data.join(', ')}]\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  return renderMermaid(container, buildDefinition(data));
}
