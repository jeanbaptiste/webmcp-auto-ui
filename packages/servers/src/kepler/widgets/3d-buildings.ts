// @ts-nocheck
// 3D buildings — extrude polygons by a `height` column, pitched view.
import { geojsonToDataset, mountKepler, renderEmpty, rowsToDataset, toRows } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const geojson = (data as any).geojson;
  let dataset: any;
  if (geojson) {
    dataset = await geojsonToDataset(geojson, 'buildings', 'buildings');
  } else {
    const rows = toRows((data as any).rows ?? data);
    if (!rows.length) return renderEmpty(container, 'kepler-3d-buildings', 'Pass {geojson} (Polygon FeatureCollection) with a `height` property.');
    dataset = await rowsToDataset(rows, 'buildings', 'buildings');
  }
  if (!dataset) return renderEmpty(container, 'kepler-3d-buildings');

  const config = {
    visState: {
      layers: [
        {
          id: 'b3d',
          type: 'geojson',
          config: {
            dataId: 'buildings',
            label: (data as any).title ?? '3D Buildings',
            isVisible: true,
            visConfig: {
              opacity: 0.9,
              filled: true,
              enable3d: true,
              elevationScale: (data as any).elevationScale ?? 5,
            },
          },
          visualChannels: { heightField: { name: 'height', type: 'real' }, heightScale: 'linear' },
        },
      ],
    },
    mapState: { pitch: 50, bearing: 24 },
  };

  return mountKepler(container, 'kepler-3d-buildings', { datasets: dataset, config, options: { centerMap: true } });
}
