// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = {};
  for (const k of ['x1', 'x2', 'y1', 'y2', 'stroke', 'strokeWidth', 'curve']) {
    if (d[k] !== undefined) opts[k] = d[k];
  }
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.link(rows, opts)],
  }));
}
