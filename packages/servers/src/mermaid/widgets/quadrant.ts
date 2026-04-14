// @ts-nocheck
import { renderMermaid } from './shared.js';

function buildDefinition(data: Record<string, unknown>): string {
  if (typeof data.definition === 'string') return data.definition;
  const title = (data.title as string) || '';
  const xAxis = (data.xAxis as { left: string; right: string }) || { left: 'Low', right: 'High' };
  const yAxis = (data.yAxis as { bottom: string; top: string }) || { bottom: 'Low', top: 'High' };
  const quadrants = (data.quadrants as string[]) || [];
  const points = (data.points as Array<{ label: string; x: number; y: number }>) || [];
  let def = 'quadrantChart\n';
  if (title) def += `  title ${title}\n`;
  def += `  x-axis "${xAxis.left}" --> "${xAxis.right}"\n`;
  def += `  y-axis "${yAxis.bottom}" --> "${yAxis.top}"\n`;
  if (quadrants.length === 4) {
    def += `  quadrant-1 "${quadrants[0]}"\n`;
    def += `  quadrant-2 "${quadrants[1]}"\n`;
    def += `  quadrant-3 "${quadrants[2]}"\n`;
    def += `  quadrant-4 "${quadrants[3]}"\n`;
  }
  for (const p of points) {
    def += `  "${p.label}": [${p.x}, ${p.y}]\n`;
  }
  return def;
}

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void> {
  await renderMermaid(container, buildDefinition(data));
}
