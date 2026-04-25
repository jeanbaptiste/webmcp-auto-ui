// @ts-nocheck
// Cluster layer — dynamic point clustering at zoom level.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-cluster', 'Pass [{lat, lng, value?}].');

  const dataset = await rowsToDataset(rows, 'cluster', 'cluster');
  if (!dataset) return renderEmpty(container, 'kepler-cluster');

  const config = {
    visState: {
      layers: [
        {
          id: 'cl',
          type: 'cluster',
          config: {
            dataId: 'cluster',
            label: (data as any).title ?? 'Clusters',
            columns: { lat: 'lat', lng: 'lng' },
            isVisible: true,
            visConfig: {
              opacity: 0.85,
              clusterRadius: (data as any).clusterRadius ?? 40,
              radiusRange: [1, 40],
            },
          },
          visualChannels: rows[0]?.value !== undefined
            ? { colorField: { name: 'value', type: 'real' }, colorScale: 'quantile' }
            : {},
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-cluster', { datasets: dataset, config, options: { centerMap: true } });
}
