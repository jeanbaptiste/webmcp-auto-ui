// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [6.8652, 45.8326], zoom = 11, pitch = 60, bearing = 30, style = 'voyager', exaggeration = 1.5 } = data as any;
  const { map, cleanup } = await createMap(container, { center, zoom, style, pitch, bearing });
  await whenLoaded(map);

  // Use MapLibre demo terrain tiles (Mapzen-hosted, free).
  map.addSource('terrain-dem', {
    type: 'raster-dem',
    url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
    tileSize: 256,
  });
  try {
    map.setTerrain({ source: 'terrain-dem', exaggeration });
  } catch {
    // some style setups may reject setTerrain — ignore
  }
  map.addLayer({
    id: 'hillshading',
    source: 'terrain-dem',
    type: 'hillshade',
    paint: { 'hillshade-exaggeration': 0.5 },
  });

  return cleanup;
}
