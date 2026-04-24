// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

// rows: array of objects; dimensions: names of fields to show as axes
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { rows = [], dimensions = [], title, colorField } = data as any;
  // Flatten into long format: [{ __row, dim, value }]
  const long: any[] = [];
  rows.forEach((r: any, idx: number) => {
    for (const d of dimensions) {
      long.push({ __row: idx, dim: d, value: Number(r[d]) });
      if (colorField) long[long.length - 1].__color = r[colorField];
    }
  });
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values: long },
    mark: { type: 'line', opacity: 0.4 },
    encoding: {
      x: { field: 'dim', type: 'nominal', sort: dimensions, title: null },
      y: { field: 'value', type: 'quantitative' },
      detail: { field: '__row' },
      color: colorField
        ? { field: '__color', type: 'nominal', title: colorField }
        : { value: '#4c78a8' },
    },
  };
  return renderVegaSpec(container, spec, { mode: 'vega-lite' });
}
