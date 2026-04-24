// @ts-nocheck
import { loadPlot, renderPlot, commonOpts } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const d: any = data;
  const geojson = d.geojson ?? d.features ?? d;
  const opts: any = {};
  if (d.fill) opts.fill = d.fill;
  if (d.stroke) opts.stroke = d.stroke;
  if (d.strokeWidth) opts.strokeWidth = d.strokeWidth;
  if (d.fillOpacity) opts.fillOpacity = d.fillOpacity;
  if (d.tip) opts.tip = true;
  const projection = d.projection ?? 'mercator';
  return renderPlot(container, () => ({
    ...commonOpts(d),
    projection,
    marks: [Plot.geo(geojson, opts)],
  }));
}
