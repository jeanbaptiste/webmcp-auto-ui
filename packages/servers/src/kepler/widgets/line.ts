// @ts-nocheck
// Line layer — origin/destination as straight (non-arc) lines.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-line', 'Pass [{lat0, lng0, lat1, lng1, value?}].');

  const dataset = await rowsToDataset(rows, 'lines', 'lines');
  if (!dataset) return renderEmpty(container, 'kepler-line');

  const config = {
    visState: {
      layers: [
        {
          id: 'ln',
          type: 'line',
          config: {
            dataId: 'lines',
            label: (data as any).title ?? 'Lines',
            columns: { lat0: 'lat0', lng0: 'lng0', lat1: 'lat1', lng1: 'lng1' },
            isVisible: true,
            visConfig: { opacity: 0.85, thickness: (data as any).thickness ?? 2 },
          },
          visualChannels: rows[0]?.value !== undefined
            ? { colorField: { name: 'value', type: 'real' }, colorScale: 'quantile' }
            : {},
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-line', { datasets: dataset, config, options: { centerMap: true } });
}
