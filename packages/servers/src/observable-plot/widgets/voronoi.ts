// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const xKey = d.xKey ?? 'x';
  const yKey = d.yKey ?? 'y';
  const opts: any = { x: xKey, y: yKey };
  if (d.fill) opts.fill = d.fill;
  if (d.stroke) opts.stroke = d.stroke;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [
      Plot.voronoi(rows, opts),
      Plot.dot(rows, { x: xKey, y: yKey, fill: 'currentColor' }),
    ],
  }));
}
