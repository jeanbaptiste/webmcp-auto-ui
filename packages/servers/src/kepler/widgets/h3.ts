// @ts-nocheck
// H3 hexagon layer — pre-computed H3 cell ids in `hex_id` column.
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-h3', 'Pass [{hex_id, value?}] with H3 cell ids.');

  const dataset = await rowsToDataset(rows, 'h3', 'h3');
  if (!dataset) return renderEmpty(container, 'kepler-h3');

  const config = {
    visState: {
      layers: [
        {
          id: 'h3',
          type: 'hexagonId',
          config: {
            dataId: 'h3',
            label: (data as any).title ?? 'H3 Cells',
            columns: { hex_id: 'hex_id' },
            isVisible: true,
            visConfig: {
              opacity: 0.85,
              coverage: 0.95,
              enable3d: (data as any).enable3d ?? false,
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

  return mountKepler(container, 'kepler-h3', { datasets: dataset, config, options: { centerMap: true } });
}
