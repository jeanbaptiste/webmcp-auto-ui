// @ts-nocheck
import { renderVegaSpec } from './shared.js';

// matrix: square 2D array of flows; labels: names for each row/col
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { matrix = [], labels = [], title } = data as any;
  // Convert matrix to nodes + links
  const nodes = labels.map((n: string, i: number) => ({ index: i, name: n }));
  const links: any[] = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      const v = matrix[i][j];
      if (v > 0) links.push({ source: i, target: j, value: v });
    }
  }
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 500,
    height: 500,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    title,
    padding: 10,
    signals: [
      { name: 'cx', update: 'width / 2' },
      { name: 'cy', update: 'height / 2' },
      { name: 'radius', update: 'min(width, height) / 2 - 20' },
    ],
    data: [
      { name: 'nodes', values: nodes },
      { name: 'links', values: links },
    ],
    scales: [
      { name: 'color', type: 'ordinal', domain: { data: 'nodes', field: 'name' }, range: { scheme: 'category10' } },
    ],
    marks: [
      {
        type: 'symbol',
        from: { data: 'nodes' },
        encode: {
          enter: {
            fill: { scale: 'color', field: 'name' },
            size: { value: 200 },
          },
          update: {
            x: { signal: 'cx + radius * cos(2 * PI * datum.index / length(data("nodes")))' },
            y: { signal: 'cy + radius * sin(2 * PI * datum.index / length(data("nodes")))' },
          },
        },
      },
      {
        type: 'text',
        from: { data: 'nodes' },
        encode: {
          enter: {
            text: { field: 'name' },
            fill: { value: '#666' },
            fontSize: { value: 11 },
            align: { value: 'center' },
            baseline: { value: 'middle' },
          },
          update: {
            x: { signal: 'cx + (radius + 14) * cos(2 * PI * datum.index / length(data("nodes")))' },
            y: { signal: 'cy + (radius + 14) * sin(2 * PI * datum.index / length(data("nodes")))' },
          },
        },
      },
      {
        type: 'path',
        from: { data: 'links' },
        encode: {
          enter: {
            stroke: { value: '#888' },
            strokeOpacity: { value: 0.4 },
            strokeWidth: { field: 'value' },
          },
          update: {
            path: {
              signal:
                "'M' + (cx + radius * cos(2 * PI * datum.source / length(data(\"nodes\")))) + ',' + (cy + radius * sin(2 * PI * datum.source / length(data(\"nodes\")))) + 'Q' + cx + ',' + cy + ' ' + (cx + radius * cos(2 * PI * datum.target / length(data(\"nodes\")))) + ',' + (cy + radius * sin(2 * PI * datum.target / length(data(\"nodes\"))))",
            },
          },
        },
      },
    ],
  };
  return renderVegaSpec(container, spec, { mode: 'vega' });
}
