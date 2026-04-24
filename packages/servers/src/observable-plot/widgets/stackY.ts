// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const stackOpts: any = {};
  if (d.offset) stackOpts.offset = d.offset;
  if (d.order) stackOpts.order = d.order;
  const barOpts: any = {
    x: d.xKey ?? 'x',
    y: d.yKey ?? 'y',
  };
  if (d.fill) barOpts.fill = d.fill;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.barY(rows, Plot.stackY(stackOpts, barOpts))],
  }));
}
