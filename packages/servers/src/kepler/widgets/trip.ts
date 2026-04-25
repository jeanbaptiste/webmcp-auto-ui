// @ts-nocheck
// Trip layer — animated time-stamped paths. Expects GeoJSON with timestamps
// in coordinate tuples [lng, lat, alt, ts] OR rows {trip_id, lat, lng, ts}.
import { geojsonToDataset, mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const geojson = (data as any).geojson;
  let dataset: any;

  if (geojson) {
    dataset = await geojsonToDataset(geojson, 'trips', 'trips');
  } else {
    const rows = toRows((data as any).rows ?? data);
    if (!rows.length) return renderEmpty(container, 'kepler-trip', 'Pass {geojson} (trip FeatureCollection) or rows with [trip_id, lat, lng, ts].');
    dataset = await rowsToDataset(rows, 'trips', 'trips');
  }
  if (!dataset) return renderEmpty(container, 'kepler-trip');

  const config = {
    visState: {
      layers: [
        {
          id: 't',
          type: 'trip',
          config: {
            dataId: 'trips',
            label: (data as any).title ?? 'Trips',
            isVisible: true,
            visConfig: { opacity: 0.85, thickness: 2, trailLength: (data as any).trailLength ?? 180 },
          },
        },
      ],
      animationConfig: { currentTime: null, speed: (data as any).speed ?? 1 },
    },
  };

  return mountKepler(container, 'kepler-trip', { datasets: dataset, config, options: { centerMap: true } });
}
