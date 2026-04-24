// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const xKey = d.xKey ?? 'x';
  const yKey = d.yKey ?? 'y';
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [
      Plot.dot(rows, { x: xKey, y: yKey, fill: d.fill }),
      Plot.tip(rows, Plot.pointer({ x: xKey, y: yKey })),
    ],
  }));
}
