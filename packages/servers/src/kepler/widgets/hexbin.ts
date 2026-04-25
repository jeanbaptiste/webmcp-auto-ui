// @ts-nocheck
// Hexbin aggregation — bins points into hexagonal cells.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-hexbin', 'Pass [{lat, lng, value?}].');

  const dataset = await rowsToDataset(rows, 'hexbin', 'hexbin');
  if (!dataset) return renderEmpty(container, 'kepler-hexbin');

  const config = {
    visState: {
      layers: [
        {
          id: 'hex',
          type: 'hexagon',
          config: {
            dataId: 'hexbin',
            label: (data as any).title ?? 'Hexbins',
            columns: { lat: 'lat', lng: 'lng' },
            isVisible: true,
            visConfig: {
              opacity: 0.85,
              worldUnitSize: (data as any).worldUnitSize ?? 1,
              resolution: 8,
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

  return mountKepler(container, 'kepler-hexbin', { datasets: dataset, config, options: { centerMap: true } });
}
