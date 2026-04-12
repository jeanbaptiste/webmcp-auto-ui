// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, layers = [] } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  const baseLayers: Record<string, any> = {};
  const overlays: Record<string, any> = {};

  for (const layerDef of layers) {
    const group = L.layerGroup();
    if (layerDef.markers) {
      for (const m of layerDef.markers) {
        L.marker(m.latlng || center).bindPopup(m.popup || '').addTo(group);
      }
    }
    if (layerDef.circles) {
      for (const c of layerDef.circles) {
        L.circle(c.latlng || center, { radius: c.radius || 200, color: c.color || '#3388ff' }).addTo(group);
      }
    }
    overlays[layerDef.name || 'Layer'] = group;
    group.addTo(map);
  }

  L.control.layers(baseLayers, overlays).addTo(map);

  return () => { map.remove(); };
}
