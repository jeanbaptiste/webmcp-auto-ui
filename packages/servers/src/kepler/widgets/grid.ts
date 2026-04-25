// @ts-nocheck
// Grid aggregation — bins points into a square grid.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-grid', 'Pass [{lat, lng, value?}].');

  const dataset = await rowsToDataset(rows, 'grid', 'grid');
  if (!dataset) return renderEmpty(container, 'kepler-grid');

  const config = {
    visState: {
      layers: [
        {
          id: 'g',
          type: 'grid',
          config: {
            dataId: 'grid',
            label: (data as any).title ?? 'Grid',
            columns: { lat: 'lat', lng: 'lng' },
            isVisible: true,
            visConfig: {
              opacity: 0.85,
              worldUnitSize: (data as any).worldUnitSize ?? 1,
              coverage: 0.95,
              enable3d: (data as any).enable3d ?? true,
            },
          },
          visualChannels: rows[0]?.value !== undefined
            ? {
                colorField: { name: 'value', type: 'real' },
                colorScale: 'quantile',
                sizeField: { name: 'value', type: 'real' },
                sizeScale: 'linear',
              }
            : {},
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-grid', { datasets: dataset, config, options: { centerMap: true } });
}
