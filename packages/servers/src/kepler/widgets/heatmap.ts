// @ts-nocheck
// Heatmap layer — density map of points weighted by `value`.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-heatmap', 'Pass [{lat, lng, value?}].');

  const dataset = await rowsToDataset(rows, 'heatmap', 'heatmap');
  if (!dataset) return renderEmpty(container, 'kepler-heatmap');

  const config = {
    visState: {
      layers: [
        {
          id: 'heat',
          type: 'heatmap',
          config: {
            dataId: 'heatmap',
            label: (data as any).title ?? 'Heatmap',
            columns: { lat: 'lat', lng: 'lng' },
            isVisible: true,
            visConfig: {
              opacity: 0.8,
              radius: (data as any).radius ?? 20,
            },
          },
          visualChannels: rows[0]?.value !== undefined
            ? { weightField: { name: 'value', type: 'real' }, weightScale: 'linear' }
            : {},
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-heatmap', { datasets: dataset, config, options: { centerMap: true } });
}
