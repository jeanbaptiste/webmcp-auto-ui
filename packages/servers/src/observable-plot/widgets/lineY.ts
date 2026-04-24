// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { y: d.yKey ?? 'y' };
  if (d.xKey) opts.x = d.xKey;
  if (d.stroke) opts.stroke = d.stroke;
  if (d.curve) opts.curve = d.curve;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.lineY(rows, opts)],
  }));
}
