// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = {
    x: d.xKey ?? 'x',
    y: d.yKey ?? 'y',
    src: d.srcKey ?? 'src',
  };
  if (d.width) opts.width = d.width;
  if (d.height) opts.height = d.height;
  if (d.r) opts.r = d.r;
  if (d.preserveAspectRatio) opts.preserveAspectRatio = d.preserveAspectRatio;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.image(rows, opts)],
  }));
}
