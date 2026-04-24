// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const binOpts: any = { fill: 'count' };
  if (d.binWidth) binOpts.binWidth = d.binWidth;
  const outputs: any = { fill: 'count' };
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [
      Plot.dot(rows, Plot.hexbin(outputs, { x: d.xKey ?? 'x', y: d.yKey ?? 'y', binWidth: d.binWidth ?? 20 })),
    ],
  }));
}
