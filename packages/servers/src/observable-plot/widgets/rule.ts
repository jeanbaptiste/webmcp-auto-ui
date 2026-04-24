// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const orientation = d.orientation ?? 'x';
  const opts: any = {};
  if (orientation === 'x') {
    if (d.xKey) opts.x = d.xKey;
    if (d.y1 !== undefined) opts.y1 = d.y1;
    if (d.y2 !== undefined) opts.y2 = d.y2;
  } else {
    if (d.yKey) opts.y = d.yKey;
    if (d.x1 !== undefined) opts.x1 = d.x1;
    if (d.x2 !== undefined) opts.x2 = d.x2;
  }
  if (d.stroke) opts.stroke = d.stroke;
  if (d.strokeDasharray) opts.strokeDasharray = d.strokeDasharray;
  const mark = orientation === 'x' ? Plot.ruleX(rows, opts) : Plot.ruleY(rows, opts);
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [mark],
  }));
}
