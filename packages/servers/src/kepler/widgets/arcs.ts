// @ts-nocheck
// Arcs layer — lines between origin/destination coordinate pairs.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-arcs', 'Pass [{lat0, lng0, lat1, lng1, value?}].');

  const dataset = await rowsToDataset(rows, 'arcs', 'arcs');
  if (!dataset) return renderEmpty(container, 'kepler-arcs');

  const config = {
    visState: {
      layers: [
        {
          id: 'arc',
          type: 'arc',
          config: {
            dataId: 'arcs',
            label: (data as any).title ?? 'Arcs',
            columns: { lat0: 'lat0', lng0: 'lng0', lat1: 'lat1', lng1: 'lng1' },
            isVisible: true,
            visConfig: { opacity: 0.8, thickness: (data as any).thickness ?? 2 },
          },
          visualChannels: rows[0]?.value !== undefined
            ? { sizeField: { name: 'value', type: 'real' }, sizeScale: 'linear' }
            : {},
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-arcs', { datasets: dataset, config, options: { centerMap: true } });
}
