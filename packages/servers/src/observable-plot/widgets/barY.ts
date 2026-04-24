// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { x: d.xKey ?? 'x', y: d.yKey ?? 'y' };
  if (d.fill) opts.fill = d.fill;
  if (d.stroke) opts.stroke = d.stroke;
  if (d.sort) opts.sort = d.sort;
  if (d.tip) opts.tip = true;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.barY(rows, opts)],
  }));
}
