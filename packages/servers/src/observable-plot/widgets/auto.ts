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
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.auto(rows, opts)],
  }));
}
