// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { x: d.xKey ?? 'x', y: d.yKey ?? 'y' };
  if (d.bandwidth) opts.bandwidth = d.bandwidth;
  if (d.thresholds) opts.thresholds = d.thresholds;
  if (d.stroke) opts.stroke = d.stroke;
  if (d.fill) opts.fill = d.fill;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.density(rows, opts)],
  }));
}
