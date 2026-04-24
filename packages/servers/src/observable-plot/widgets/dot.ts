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
  if (d.r) opts.r = d.r;
  if (d.symbol) opts.symbol = d.symbol;
  if (d.tip) opts.tip = true;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.dot(rows, opts)],
  }));
}
