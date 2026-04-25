// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { markers = [], center, zoom } = (data ?? {}) as any;
  if (!Array.isArray(markers) || markers.length === 0) {
    return renderEmpty(container, 'openlayers-popup', 'Pass `markers: [{lon, lat, content}, ...]`. Click a marker to see its popup.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Point } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');
  const Overlay = (await import('ol/Overlay')).default;
  const { Style, Circle, Fill, Stroke } = await import('ol/style');

  container.style.position = container.style.position || 'relative';

  const features: any[] = [];
  for (const m of markers) {
    const ll = toLonLat(m);
    if (!ll) continue;
    const f = new Feature({ geometry: new Point(fromLonLat(ll)) });
    f.set('content', m.content ?? m.popup ?? '');
    features.push(f);
  }

  const layer = new VectorLayer({
    source: new VectorSource({ features }),
    style: new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: '#3388ff' }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
    }),
  });

  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);

  const popupEl = document.createElement('div');
  popupEl.style.cssText =
    'background:#fff;border:1px solid #ccc;border-radius:6px;padding:8px 10px;font:12px system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.15);min-width:80px;max-width:240px;display:none';
  container.appendChild(popupEl);
  const overlay = new Overlay({ element: popupEl, offset: [0, -12], positioning: 'bottom-center' });
  map.addOverlay(overlay);

  const onClick = (evt: any) => {
    const feat = map.forEachFeatureAtPixel(evt.pixel, (f: any) => f);
    if (feat) {
      popupEl.innerHTML = String(feat.get('content') ?? '');
      popupEl.style.display = 'block';
      overlay.setPosition(feat.getGeometry().getCoordinates());
    } else {
      popupEl.style.display = 'none';
    }
  };
  map.on('click', onClick);

  return () => {
    cleanup();
    popupEl.remove();
  };
}
