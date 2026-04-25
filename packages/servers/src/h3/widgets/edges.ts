// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellToFeature, cellCenter, edgeToLineFeature, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-edges — show the directed edges of a cell (originToDirectedEdges).
 * params: { cell?, lat?, lng?, resolution=8, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { cell, lat, lng, resolution = 8, style = 'voyager' } = data as any;

  let target: string | null = null;
  if (typeof cell === 'string') target = cell;
  else if (typeof lat === 'number' && typeof lng === 'number') {
    target = tryH3(() => h3.latLngToCell(lat, lng, resolution), null);
  }
  if (!target) return renderEmpty(container, 'h3-edges', 'Provide <code>cell</code> or lat/lng.');

  const edges = tryH3(() => h3.originToDirectedEdges(target), [] as string[]);
  if (!edges.length) return renderEmpty(container, 'h3-edges');

  const cellFc = { type: 'FeatureCollection', features: [cellToFeature(target)] };
  const edgeFc = {
    type: 'FeatureCollection',
    features: edges.map((e) => edgeToLineFeature(e)),
  };
  const [cx, cy] = cellCenter(target);
  const zoom = Math.max(1, Math.min(15, h3.getResolution(target) + 3));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3-cell', { type: 'geojson', data: cellFc });
  map.addSource('h3-edges', { type: 'geojson', data: edgeFc });

  map.addLayer({
    id: 'h3-cell-fill',
    type: 'fill',
    source: 'h3-cell',
    paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.15 },
  });
  map.addLayer({
    id: 'h3-cell-line',
    type: 'line',
    source: 'h3-cell',
    paint: { 'line-color': '#3388ff', 'line-width': 0.8, 'line-opacity': 0.5 },
  });
  map.addLayer({
    id: 'h3-edges-line',
    type: 'line',
    source: 'h3-edges',
    paint: { 'line-color': '#d62728', 'line-width': 3 },
  });

  return cleanup;
}
