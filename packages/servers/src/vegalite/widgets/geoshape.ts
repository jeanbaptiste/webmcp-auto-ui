// @ts-nocheck
import { embedSpec } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, topojson, geojson, feature, projection, scheme, valueField } = data as any;
  const dataBlock = topojson
    ? { values: topojson, format: { type: 'topojson', feature: feature ?? 'features' } }
    : { values: geojson, format: { property: 'features' } };
  const spec: any = {
    title,
    width: 'container',
    height: 360,
    data: dataBlock,
    projection: { type: projection ?? 'mercator' },
    mark: { type: 'geoshape', tooltip: true, stroke: '#999', strokeWidth: 0.5 },
    encoding: valueField
      ? { color: { field: `properties.${valueField}`, type: 'quantitative', scale: { scheme: scheme ?? 'blues' } } }
      : {},
  };
  return embedSpec(container, spec);
}
