// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { x: d.xKey ?? 'x', y: d.yKey ?? 'y' };
  if (d.fill) opts.fill = d.fill;
  if (d.fillOpacity) opts.fillOpacity = d.fillOpacity;
  if (d.curve) opts.curve = d.curve;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.areaX(rows, opts)],
  }));
}
