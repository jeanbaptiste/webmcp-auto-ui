// @ts-nocheck
// Icon layer — points rendered with named icons (`icon` column).
import { mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const rows = toRows((data as any).rows ?? data);
  if (!rows.length) return renderEmpty(container, 'kepler-icon', 'Pass [{lat, lng, icon}] (icon names from kepler icon set).');

  const dataset = await rowsToDataset(rows, 'icons', 'icons');
  if (!dataset) return renderEmpty(container, 'kepler-icon');

  const config = {
    visState: {
      layers: [
        {
          id: 'ic',
          type: 'icon',
          config: {
            dataId: 'icons',
            label: (data as any).title ?? 'Icons',
            columns: { lat: 'lat', lng: 'lng', icon: 'icon' },
            isVisible: true,
            visConfig: { opacity: 0.9, radius: (data as any).radius ?? 16 },
          },
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-icon', { datasets: dataset, config, options: { centerMap: true } });
}
