// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-polyfill — polygonToCells(geojson, resolution) — fill a polygon with hexes.
 * params: { geojson: <Polygon|Feature|FeatureCollection>, resolution=7, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { geojson, resolution = 7, style = 'voyager', color = '#2ca02c', opacity = 0.4 } = data as any;
  if (!geojson) return renderEmpty(container, 'h3-polyfill', 'Provide a GeoJSON Polygon (or Feature/FeatureCollection).');

  // Extract Polygon geometries.
  const polygons: any[] = [];
  const visit = (g: any) => {
    if (!g) return;
    if (g.type === 'FeatureCollection') g.features?.forEach(visit);
    else if (g.type === 'Feature') visit(g.geometry);
    else if (g.type === 'Polygon') polygons.push(g);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((rings: any) => polygons.push({ type: 'Polygon', coordinates: rings }));
  };
  visit(geojson);
  if (!polygons.length) return renderEmpty(container, 'h3-polyfill', 'No Polygon geometries found in input.');

  let cells: string[] = [];
  for (const p of polygons) {
    // h3-js v4: polygonToCells(coords, res, isGeoJson=true) — coords are [lng,lat]
    const c = tryH3(() => h3.polygonToCells(p.coordinates, resolution, true), [] as string[]);
    cells = cells.concat(c);
  }
  cells = Array.from(new Set(cells));
  if (!cells.length) return renderEmpty(container, 'h3-polyfill', 'No cells inside polygon at this resolution.');

  const fc = cellsToFeatureCollection(cells);

  // Compute polygon bounds for fitting view.
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const p of polygons) {
    for (const ring of p.coordinates) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const zoom = Math.max(1, Math.min(15, resolution + 1));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3-cells', { type: 'geojson', data: fc });
  map.addSource('h3-poly', { type: 'geojson', data: geojson });

  map.addLayer({
    id: 'h3-cells-fill',
    type: 'fill',
    source: 'h3-cells',
    paint: { 'fill-color': color, 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-cells-line',
    type: 'line',
    source: 'h3-cells',
    paint: { 'line-color': color, 'line-width': 0.5, 'line-opacity': 0.7 },
  });
  map.addLayer({
    id: 'h3-poly-line',
    type: 'line',
    source: 'h3-poly',
    paint: { 'line-color': '#222', 'line-width': 2 },
  });

  try {
    map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 40, animate: false });
  } catch {
    // ignore
  }

  return cleanup;
}
