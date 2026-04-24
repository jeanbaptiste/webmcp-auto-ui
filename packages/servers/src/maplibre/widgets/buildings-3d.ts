// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [2.3522, 48.8566], zoom = 16, pitch = 55, bearing = -20, style = 'voyager' } = data as any;
  const { map, cleanup } = await createMap(container, { center, zoom, style, pitch, bearing });
  await whenLoaded(map);

  // Many Carto styles expose an OpenMapTiles "building" source layer in their vector source.
  // Find a vector source and attempt to extrude using common conventions.
  const sources = map.getStyle().sources ?? {};
  const vectorSource = Object.entries(sources).find(([, s]: any) => s.type === 'vector');
  if (!vectorSource) return cleanup;

  try {
    map.addLayer({
      id: 'buildings-3d',
      source: vectorSource[0],
      'source-layer': 'building',
      filter: ['!=', ['get', 'hide_3d'], true],
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#aaa',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.9,
      },
    });
  } catch {
    // source-layer may not exist in this style — silently skip
  }

  return cleanup;
}
