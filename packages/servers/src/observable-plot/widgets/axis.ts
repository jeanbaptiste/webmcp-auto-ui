// @ts-nocheck
import { loadPlot, renderPlot, commonOpts } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const d: any = data;
  const xOpts: any = {};
  const yOpts: any = {};
  if (d.xTicks) xOpts.ticks = d.xTicks;
  if (d.yTicks) yOpts.ticks = d.yTicks;
  if (d.xLabel) xOpts.label = d.xLabel;
  if (d.yLabel) yOpts.label = d.yLabel;
  if (d.xDomain) xOpts.domain = d.xDomain;
  if (d.yDomain) yOpts.domain = d.yDomain;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    x: xOpts,
    y: yOpts,
    marks: [Plot.axisX(xOpts), Plot.axisY(yOpts), Plot.frame({ stroke: '#888' })],
  }));
}
