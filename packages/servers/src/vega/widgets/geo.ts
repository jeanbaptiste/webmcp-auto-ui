// @ts-nocheck
import { renderVegaSpec } from './shared.js';

// Simple choropleth from a GeoJSON FeatureCollection + { id: value } data map
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { geojson, values = {}, title, idField = 'id', scheme = 'blues', projection = 'mercator' } = data as any;
  const features = geojson?.features ?? [];
  // Attach values into properties
  const enriched = {
    type: 'FeatureCollection',
    features: features.map((f: any) => {
      const key = f.id ?? f.properties?.[idField];
      return {
        ...f,
        properties: { ...(f.properties || {}), __value: values[key] ?? null, __id: key },
      };
    }),
  };
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 600,
    height: 400,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    title,
    padding: 5,
    data: [
      { name: 'regions', values: enriched, format: { type: 'json', property: 'features' } },
    ],
    projections: [{ name: 'proj', type: projection, fit: { signal: "data('regions')" }, size: [{ signal: 'width' }, { signal: 'height' }] }],
    scales: [
      { name: 'color', type: 'linear', domain: { data: 'regions', field: 'properties.__value' }, range: { scheme }, zero: false, nice: true },
    ],
    marks: [
      {
        type: 'shape',
        from: { data: 'regions' },
        encode: {
          enter: { stroke: { value: '#fff' }, strokeWidth: { value: 0.5 } },
          update: {
            fill: [
              { test: 'datum.properties.__value == null', value: '#eee' },
              { scale: 'color', field: 'properties.__value' },
            ],
            tooltip: { signal: "{ id: datum.properties.__id, value: datum.properties.__value }" },
          },
        },
        transform: [{ type: 'geoshape', projection: 'proj' }],
      },
    ],
  };
  return renderVegaSpec(container, spec, { mode: 'vega' });
}
