// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { a, b, z, carpet: carpetId = 'carpet1', title, carpetData, colorscale = 'Viridis' } = data as any;
  const carpetTrace = { type: 'carpet', a: carpetData.a, b: carpetData.b, x: carpetData.x, y: carpetData.y, carpet: carpetId, aaxis: { color: '#ccc' }, baxis: { color: '#ccc' } };
  const contourTrace = { type: 'contourcarpet', a, b, z, carpet: carpetId, colorscale };
  return plotly(container, [carpetTrace, contourTrace], { ...darkLayout(title) });
}
