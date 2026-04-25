// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-resolution-compare — overlay the same region at multiple H3 resolutions.
 * params: { lat, lng, resolutions=[5,7,9], k=3, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { lat, lng, resolutions = [5, 7, 9], k = 3, style = 'positron' } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(container, 'h3-resolution-compare', 'Provide numeric <code>lat</code> and <code>lng</code>.');
  }
  const resList: number[] = (resolutions as number[]).filter((r) => Number.isInteger(r) && r >= 0 && r <= 15);
  if (!resList.length) return renderEmpty(container, 'h3-resolution-compare', 'Provide a list of resolutions.');

  const palette = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
  const sources: { id: string; fc: any; color: string }[] = [];
  for (let i = 0; i < resList.length; i++) {
    const r = resList[i];
    const center = tryH3(() => h3.latLngToCell(lat, lng, r), null);
    if (!center) continue;
    const cells = tryH3(() => h3.gridDisk(center, k), [] as string[]);
    if (!cells.length) continue;
    sources.push({ id: `h3-r${r}`, fc: cellsToFeatureCollection(cells, () => ({ res: r })), color: palette[i % palette.length] });
  }
  if (!sources.length) return renderEmpty(container, 'h3-resolution-compare');

  const zoom = Math.max(1, Math.min(15, Math.min(...resList) + 2));
  const { map, cleanup } = await createMap(container, { center: [lng, lat], zoom, style });
  await whenLoaded(map);

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    map.addSource(s.id, { type: 'geojson', data: s.fc });
    map.addLayer({
      id: `${s.id}-line`,
      type: 'line',
      source: s.id,
      paint: { 'line-color': s.color, 'line-width': 2 - i * 0.3, 'line-opacity': 0.85 },
    });
  }

  return cleanup;
}
