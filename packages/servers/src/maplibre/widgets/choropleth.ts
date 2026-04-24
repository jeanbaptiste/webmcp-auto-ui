// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const {
    center = [2.3522, 48.8566],
    zoom = 5,
    style = 'positron',
    geojson,
    valueProperty = 'value',
    colorRamp = ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
    opacity = 0.75,
  } = data as any;

  const { map, cleanup } = await createMap(container, { center, zoom, style });
  await whenLoaded(map);

  if (!geojson) return cleanup;

  const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
  const values = features.map((f: any) => Number(f?.properties?.[valueProperty])).filter((n: number) => Number.isFinite(n));
  const min = Math.min(...values);
  const max = Math.max(...values);

  const stops: any[] = [];
  for (let i = 0; i < colorRamp.length; i++) {
    const v = min + (i / (colorRamp.length - 1)) * (max - min);
    stops.push(v, colorRamp[i]);
  }

  map.addSource('ch', { type: 'geojson', data: geojson });
  map.addLayer({
    id: 'ch-fill',
    type: 'fill',
    source: 'ch',
    paint: {
      'fill-color': ['interpolate', ['linear'], ['to-number', ['get', valueProperty]], ...stops],
      'fill-opacity': opacity,
      'fill-outline-color': '#666',
    },
  });

  return cleanup;
}
