// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { circles = [], center, zoom } = (data ?? {}) as any;
  if (!Array.isArray(circles) || circles.length === 0) {
    return renderEmpty(container, 'openlayers-circles', 'Pass `circles: [{ lon, lat, radius (meters), color? }]`.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const CircleGeom = (await import('ol/geom/Circle')).default;
  const { fromLonLat } = await import('ol/proj');
  const { Style, Fill, Stroke } = await import('ol/style');

  const features = circles
    .map((c: any) => {
      const ll = toLonLat(c);
      if (!ll) return null;
      const f = new Feature({ geometry: new CircleGeom(fromLonLat(ll), c.radius ?? 1000) });
      f.set('color', c.color ?? '#3388ff');
      return f;
    })
    .filter(Boolean);

  const layer = new VectorLayer({
    source: new VectorSource({ features }),
    style: (feat: any) =>
      new Style({
        fill: new Fill({ color: hexA(feat.get('color'), 0.25) }),
        stroke: new Stroke({ color: feat.get('color'), width: 2 }),
      }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}

function hexA(color: string, alpha: number): string {
  if (color?.startsWith('rgb')) return color;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color ?? '');
  if (!m) return `rgba(51,136,255,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}
