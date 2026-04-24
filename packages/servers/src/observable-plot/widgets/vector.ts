// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { x: d.xKey ?? 'x', y: d.yKey ?? 'y' };
  if (d.length) opts.length = d.length;
  if (d.rotate !== undefined) opts.rotate = d.rotate;
  if (d.stroke) opts.stroke = d.stroke;
  if (d.strokeWidth) opts.strokeWidth = d.strokeWidth;
  if (d.shape) opts.shape = d.shape;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.vector(rows, opts)],
  }));
}
