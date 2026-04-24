// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const orientation = d.orientation ?? 'x';
  const opts: any = {};
  if (orientation === 'x') {
    opts.x = d.xKey ?? 'x';
    if (d.yKey) opts.y = d.yKey;
  } else {
    opts.y = d.yKey ?? 'y';
    if (d.xKey) opts.x = d.xKey;
  }
  if (d.stroke) opts.stroke = d.stroke;
  const mark = orientation === 'x' ? Plot.tickX(rows, opts) : Plot.tickY(rows, opts);
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [mark],
  }));
}
