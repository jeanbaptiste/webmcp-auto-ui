// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { a, b, carpet: carpetId = 'carpet1', mode = 'markers', markerSize = 8, title, carpetData } = data as any;
  const carpetTrace = { type: 'carpet', a: carpetData.a, b: carpetData.b, x: carpetData.x, y: carpetData.y, carpet: carpetId, aaxis: { color: '#ccc' }, baxis: { color: '#ccc' } };
  const scatterTrace = { type: 'scattercarpet', a, b, carpet: carpetId, mode, marker: { size: markerSize } };
  return plotly(container, [carpetTrace, scatterTrace], { ...darkLayout(title) });
}
