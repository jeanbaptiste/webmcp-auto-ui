// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { y: d.yKey ?? 'y' };
  if (d.xKey) opts.x = d.xKey;
  if (d.fill) opts.fill = d.fill;
  if (d.stroke) opts.stroke = d.stroke;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.boxY(rows, opts)],
  }));
}
