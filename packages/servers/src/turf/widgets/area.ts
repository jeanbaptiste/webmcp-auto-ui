// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, addLabelOverlay, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { feature, geojson } = data as any;
  const inputRaw = feature ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-area', 'Pass a polygon <code>feature</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-area', 'Could not parse feature.');

  let m2 = 0;
  try {
    m2 = turf.area(input);
  } catch (e) {
    console.warn('[turf-area] failed', e);
  }

  const km2 = m2 / 1e6;
  const fc = turf.featureCollection([stamp(input, 'result')]);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.4 });
  const label = km2 >= 1 ? `${km2.toFixed(2)} km²` : `${m2.toFixed(0)} m²`;
  const removeLabel = addLabelOverlay(container, `Area: ${label}`);
  return () => {
    removeLabel();
    cleanup();
  };
}
