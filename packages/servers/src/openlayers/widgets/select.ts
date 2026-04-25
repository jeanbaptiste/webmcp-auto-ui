// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points = [], center, zoom } = (data ?? {}) as any;
  if (!Array.isArray(points) || points.length === 0) {
    return renderEmpty(container, 'openlayers-select', 'Pass `points: [[lon, lat], ...]`. Click features to select them.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Point } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');
  const Select = (await import('ol/interaction/Select')).default;
  const { Style, Circle, Fill, Stroke } = await import('ol/style');

  const features = points
    .map((p: any) => toLonLat(p))
    .filter(Boolean)
    .map((ll: any) => new Feature({ geometry: new Point(fromLonLat(ll)) }));

  const layer = new VectorLayer({
    source: new VectorSource({ features }),
    style: new Style({
      image: new Circle({
        radius: 6,
        fill: new Fill({ color: '#3388ff' }),
        stroke: new Stroke({ color: '#fff', width: 1.5 }),
      }),
    }),
  });

  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);

  const select = new Select({
    style: new Style({
      image: new Circle({
        radius: 9,
        fill: new Fill({ color: '#ff8800' }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
    }),
  });
  map.addInteraction(select);
  return cleanup;
}
