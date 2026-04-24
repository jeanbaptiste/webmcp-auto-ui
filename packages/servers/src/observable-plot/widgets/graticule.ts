// @ts-nocheck
import { loadPlot, renderPlot, commonOpts } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const d: any = data;
  const projection = d.projection ?? 'equal-earth';
  const marks: any[] = [
    Plot.sphere({ stroke: d.sphereStroke ?? '#888' }),
    Plot.graticule({ stroke: d.stroke ?? '#ccc', strokeOpacity: 0.5 }),
  ];
  if (d.geojson) marks.push(Plot.geo(d.geojson, { fill: d.fill, stroke: d.featureStroke }));
  return renderPlot(container, () => ({
    ...commonOpts(d),
    projection,
    marks,
  }));
}
