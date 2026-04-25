// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { features = [], center, zoom, colorField = 'color', radiusField = 'radius' } = (data ?? {}) as any;
  if (!Array.isArray(features) || features.length === 0) {
    return renderEmpty(container, 'openlayers-feature-style', 'Pass `features: [{lon, lat, color, radius, label}]`.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Point } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');
  const { Style, Fill, Stroke, Circle, Text } = await import('ol/style');

  const olFeats = features
    .map((f: any) => {
      const ll = toLonLat(f);
      if (!ll) return null;
      const ft = new Feature({ geometry: new Point(fromLonLat(ll)) });
      ft.set('color', f[colorField] ?? '#3388ff');
      ft.set('radius', f[radiusField] ?? 6);
      ft.set('label', f.label ?? '');
      return ft;
    })
    .filter(Boolean);

  const layer = new VectorLayer({
    source: new VectorSource({ features: olFeats }),
    style: (feat: any) =>
      new Style({
        image: new Circle({
          radius: feat.get('radius'),
          fill: new Fill({ color: feat.get('color') }),
          stroke: new Stroke({ color: '#fff', width: 1.5 }),
        }),
        text: feat.get('label')
          ? new Text({
              text: String(feat.get('label')),
              font: '12px system-ui',
              fill: new Fill({ color: '#222' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              offsetY: -14,
            })
          : undefined,
      }),
  });

  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
