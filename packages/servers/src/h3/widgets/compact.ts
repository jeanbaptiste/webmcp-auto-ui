// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, cellsCentroid, rampExpression, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-compact — compactCells(set) — show the compacted form of a uniform-resolution set.
 * Color by resolution so users see the multi-resolution result.
 * params: { cells?: string[], lat?, lng?, resolution=8, k=4, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { cells, lat, lng, resolution = 8, k = 4, style = 'voyager', opacity = 0.55 } = data as any;

  let inputCells: string[] = [];
  if (Array.isArray(cells) && cells.length) {
    inputCells = cells.filter((c) => typeof c === 'string');
  } else if (typeof lat === 'number' && typeof lng === 'number') {
    const c = tryH3(() => h3.latLngToCell(lat, lng, resolution), null);
    if (c) inputCells = tryH3(() => h3.gridDisk(c, k), [] as string[]);
  }
  if (!inputCells.length) {
    return renderEmpty(container, 'h3-compact', 'Provide <code>cells</code> array, or lat/lng to generate one.');
  }

  const compacted = tryH3(() => h3.compactCells(inputCells), [] as string[]);
  if (!compacted.length) return renderEmpty(container, 'h3-compact', 'Compaction failed (cells likely span resolutions).');

  const fc = cellsToFeatureCollection(compacted, (c) => ({ res: h3.getResolution(c) }));
  const resVals = compacted.map((c) => h3.getResolution(c));
  const min = Math.min(...resVals);
  const max = Math.max(...resVals);
  const [cx, cy] = cellsCentroid(compacted);
  const zoom = Math.max(1, Math.min(15, min + 1));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'h3-fill',
    type: 'fill',
    source: 'h3',
    paint: { 'fill-color': rampExpression('res', min, max), 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-outline',
    type: 'line',
    source: 'h3',
    paint: { 'line-color': '#111', 'line-width': 0.7, 'line-opacity': 0.6 },
  });

  return cleanup;
}
