// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const opts: any = { x: d.xKey ?? 'x', y: d.yKey ?? 'y', text: d.textKey ?? 'text' };
  if (d.fill) opts.fill = d.fill;
  if (d.fontSize) opts.fontSize = d.fontSize;
  if (d.dx) opts.dx = d.dx;
  if (d.dy) opts.dy = d.dy;
  if (d.textAnchor) opts.textAnchor = d.textAnchor;
  if (d.rotate !== undefined) opts.rotate = d.rotate;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.text(rows, opts)],
  }));
}
