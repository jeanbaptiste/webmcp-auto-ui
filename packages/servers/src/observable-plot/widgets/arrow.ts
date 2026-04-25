// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = {};
  for (const k of ['x1', 'x2', 'y1', 'y2', 'stroke', 'strokeWidth', 'bend', 'headLength', 'headAngle']) {
    if (d[k] !== undefined) opts[k] = d[k];
  }
  // Plot.arrow needs explicit channel keys; default them when rows already use {x1,y1,x2,y2}.
  const sample = rows[0] ?? {};
  for (const k of ['x1', 'y1', 'x2', 'y2']) {
    if (opts[k] === undefined && sample[k] !== undefined) opts[k] = k;
  }
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.arrow(rows, opts)],
  }));
}
