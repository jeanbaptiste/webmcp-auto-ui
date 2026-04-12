// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { header, cells, title } = data as any;
  const traces = [{
    type: 'table',
    header: { values: header.values, fill: { color: header.fillColor || '#2a2a2a' }, font: { color: '#ccc' }, align: 'center' },
    cells: { values: cells.values, fill: { color: cells.fillColor || '#1a1a1a' }, font: { color: '#ccc' }, align: 'center' },
  }];
  return plotly(container, traces, { ...darkLayout(title) });
}
