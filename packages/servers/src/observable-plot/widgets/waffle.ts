// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const orientation = d.orientation ?? 'y';
  const opts: any = {};
  if (d.xKey) opts.x = d.xKey;
  if (d.yKey) opts.y = d.yKey;
  if (d.fill) opts.fill = d.fill;
  if (d.unit) opts.unit = d.unit;
  const mark = orientation === 'x' ? Plot.waffleX(rows, opts) : Plot.waffleY(rows, opts);
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [mark],
  }));
}
