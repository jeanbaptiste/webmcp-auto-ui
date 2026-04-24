// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = {};
  if (d.binWidth) opts.binWidth = d.binWidth;
  if (d.stroke) opts.stroke = d.stroke;
  const marks: any[] = [Plot.hexgrid(opts)];
  if (rows.length && d.xKey && d.yKey) {
    marks.push(Plot.dot(rows, { x: d.xKey, y: d.yKey }));
  }
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks,
  }));
}
