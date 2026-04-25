// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = {};
  if (d.xKey) opts.x = d.xKey;
  if (d.yKey) opts.y = d.yKey;
  if (d.colorKey) opts.color = d.colorKey;
  if (d.sizeKey) opts.size = d.sizeKey;
  if (d.mark) opts.mark = d.mark;
  // Plot.auto requires at least x or y; fall back to common keys present in rows.
  if (opts.x === undefined && opts.y === undefined) {
    const sample = rows[0] ?? {};
    const keys = Object.keys(sample);
    if (sample.x !== undefined) opts.x = 'x';
    else if (keys[0]) opts.x = keys[0];
    if (sample.y !== undefined) opts.y = 'y';
    else if (keys[1] && keys[1] !== opts.x) opts.y = keys[1];
  }
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.auto(rows, opts)],
  }));
}
