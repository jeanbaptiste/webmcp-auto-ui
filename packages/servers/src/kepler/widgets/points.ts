// @ts-nocheck
// Points layer — lat/lng/value rows rendered as colored circles.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-points', 'No rows. Pass [{lat, lng, value?}] or {lat:[], lng:[]}.');

  const dataset = await rowsToDataset(rows, (data as any).label ?? 'points', 'points');
  if (!dataset) return renderEmpty(container, 'kepler-points', 'Could not build dataset.');

  const config = {
    visState: {
      layers: [
        {
          id: 'pts',
          type: 'point',
          config: {
            dataId: 'points',
            label: (data as any).title ?? 'Points',
            columns: { lat: 'lat', lng: 'lng', altitude: null },
            isVisible: true,
            visConfig: {
              radius: (data as any).radius ?? 8,
              opacity: (data as any).opacity ?? 0.8,
              colorRange: (data as any).colorRange ?? undefined,
            },
          },
          visualChannels: rows[0]?.value !== undefined
            ? { colorField: { name: 'value', type: 'real' }, colorScale: 'quantile' }
            : {},
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-points', { datasets: dataset, config, options: { centerMap: true } });
}
