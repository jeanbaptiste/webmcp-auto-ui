// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { x: d.xKey ?? 'x', y: d.yKey ?? 'y' };
  if (d.stroke) opts.stroke = d.stroke;
  if (d.strokeWidth) opts.strokeWidth = d.strokeWidth;
  if (d.curve) opts.curve = d.curve;
  if (d.marker) opts.marker = d.marker;
  if (d.tip) opts.tip = true;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.line(rows, opts)],
  }));
}
