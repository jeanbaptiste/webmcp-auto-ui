// @ts-nocheck
import { loadPlot, renderPlot, commonOpts, zipData } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const rows = zipData(data as any);
  const d: any = data;
  const n = d.n ?? 20;
  const k = d.k ?? 2;
  const xKey = d.xKey ?? 'x';
  const yKey = d.yKey ?? 'y';
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [
      Plot.lineY(rows, Plot.bollingerY({ x: xKey, y: yKey, n, k })),
      Plot.line(rows, { x: xKey, y: yKey, stroke: '#888' }),
    ],
  }));
}
