// @ts-nocheck
// Polygon layer — generic GeoJSON polygons.
import { geojsonToDataset, mountKepler, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const geojson = (data as any).geojson;
  if (!geojson) return renderEmpty(container, 'kepler-polygon', 'Pass {geojson: FeatureCollection<Polygon>}.');

  const dataset = await geojsonToDataset(geojson, 'polygons', 'polygons');
  if (!dataset) return renderEmpty(container, 'kepler-polygon');

  const colorField = (data as any).colorField as string | undefined;
  const config = {
    visState: {
      layers: [
        {
          id: 'p',
          type: 'geojson',
          config: {
            dataId: 'polygons',
            label: (data as any).title ?? 'Polygons',
            isVisible: true,
            visConfig: {
              opacity: 0.7,
              filled: true,
              stroked: true,
              strokeOpacity: 0.9,
            },
          },
          visualChannels: colorField
            ? { colorField: { name: colorField, type: 'real' }, colorScale: 'quantile' }
            : {},
        },
      ],
    },
  };

  return mountKepler(container, 'kepler-polygon', { datasets: dataset, config, options: { centerMap: true } });
}
