// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points = [], center, zoom, radius = 8, blur = 15, weightField } = (data ?? {}) as any;
  if (!Array.isArray(points) || points.length === 0) {
    return renderEmpty(container, 'openlayers-heatmap', 'Pass `points: [[lon, lat], ...]` or `[{lon, lat, weight}, ...]`.');
  }
  const HeatmapLayer = (await import('ol/layer/Heatmap')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Point } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');

  const features: any[] = [];
  for (const p of points) {
    const ll = toLonLat(p);
    if (!ll) continue;
    const f = new Feature({ geometry: new Point(fromLonLat(ll)) });
    const w = p.weight ?? (weightField ? p[weightField] : undefined);
    if (typeof w === 'number') f.set('weight', w);
    features.push(f);
  }

  const layer = new HeatmapLayer({
    source: new VectorSource({ features }),
    radius,
    blur,
    weight: (feat: any) => {
      const w = feat.get('weight');
      return typeof w === 'number' ? w : 1;
    },
  });

  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
