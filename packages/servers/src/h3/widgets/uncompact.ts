// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, cellsCentroid, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-uncompact — show the decomposition of a compacted set into uniform resolution.
 * Renders the original (compacted) cells as bold outlines on top of the
 * uncompacted children fill, so the multi-res → uniform expansion is visible.
 * params: { cells: string[], targetResolution?, style? }
 *   OR    { lat, lng, parentResolution=5, targetResolution=8, k=2, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { cells, lat, lng, parentResolution = 5, targetResolution, k = 2, style = 'voyager', opacity = 0.45 } = data as any;

  let compacted: string[] = [];
  let target = typeof targetResolution === 'number' ? targetResolution : null;

  if (Array.isArray(cells) && cells.length) {
    compacted = cells.filter((c) => typeof c === 'string');
    if (target == null) {
      const maxRes = Math.max(...compacted.map((c) => h3.getResolution(c)));
      target = Math.min(15, maxRes + 1);
    }
  } else if (typeof lat === 'number' && typeof lng === 'number') {
    const center = tryH3(() => h3.latLngToCell(lat, lng, parentResolution), null);
    if (center) {
      const disk = tryH3(() => h3.gridDisk(center, k), [] as string[]);
      // Compact then uncompact for demo purposes.
      compacted = tryH3(() => h3.compactCells(disk), disk);
    }
    if (target == null) target = parentResolution + 2;
  }

  if (!compacted.length || target == null) {
    return renderEmpty(container, 'h3-uncompact', 'Provide <code>cells</code> array (or lat/lng to generate one).');
  }

  const expanded = tryH3(() => h3.uncompactCells(compacted, target), [] as string[]);
  if (!expanded.length) return renderEmpty(container, 'h3-uncompact', 'Uncompact failed at this resolution.');

  const expandedFc = cellsToFeatureCollection(expanded);
  const compactedFc = cellsToFeatureCollection(compacted, (c) => ({ res: h3.getResolution(c) }));
  const [cx, cy] = cellsCentroid(compacted);
  const zoom = Math.max(1, Math.min(15, target));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3-expanded', { type: 'geojson', data: expandedFc });
  map.addSource('h3-compacted', { type: 'geojson', data: compactedFc });

  map.addLayer({
    id: 'h3-expanded-fill',
    type: 'fill',
    source: 'h3-expanded',
    paint: { 'fill-color': '#3388ff', 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-expanded-line',
    type: 'line',
    source: 'h3-expanded',
    paint: { 'line-color': '#3388ff', 'line-width': 0.3, 'line-opacity': 0.5 },
  });
  map.addLayer({
    id: 'h3-compacted-line',
    type: 'line',
    source: 'h3-compacted',
    paint: { 'line-color': '#d62728', 'line-width': 2 },
  });

  return cleanup;
}
