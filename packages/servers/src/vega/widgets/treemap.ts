// @ts-nocheck
import { renderVegaSpec } from './shared.js';

// Expects a flat list of nodes: [{ id, parent, name, size? }]
// Root node has parent = null (or undefined).
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { nodes = [], title } = data as any;
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 600,
    height: 400,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    title,
    padding: 0,
    data: [
      {
        name: 'tree',
        values: nodes,
        transform: [
          { type: 'stratify', key: 'id', parentKey: 'parent' },
          {
            type: 'treemap',
            field: 'size',
            sort: { field: 'value' },
            round: true,
            method: 'squarify',
            size: [{ signal: 'width' }, { signal: 'height' }],
          },
        ],
      },
      { name: 'nodes', source: 'tree', transform: [{ type: 'filter', expr: 'datum.children' }] },
      { name: 'leaves', source: 'tree', transform: [{ type: 'filter', expr: '!datum.children' }] },
    ],
    scales: [
      { name: 'color', type: 'ordinal', domain: { data: 'nodes', field: 'name' }, range: { scheme: 'tableau10' } },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'nodes' },
        encode: {
          enter: { fill: { scale: 'color', field: 'name' } },
          update: { x: { field: 'x0' }, y: { field: 'y0' }, x2: { field: 'x1' }, y2: { field: 'y1' } },
        },
      },
      {
        type: 'rect',
        from: { data: 'leaves' },
        encode: {
          enter: { stroke: { value: '#fff' } },
          update: {
            x: { field: 'x0' },
            y: { field: 'y0' },
            x2: { field: 'x1' },
            y2: { field: 'y1' },
            fill: { value: 'transparent' },
          },
        },
      },
      {
        type: 'text',
        from: { data: 'leaves' },
        interactive: false,
        encode: {
          enter: {
            fill: { value: '#333' },
            text: { field: 'name' },
            fontSize: { value: 11 },
            align: { value: 'center' },
            baseline: { value: 'middle' },
          },
          update: {
            x: { signal: '(datum.x0 + datum.x1) / 2' },
            y: { signal: '(datum.y0 + datum.y1) / 2' },
          },
        },
      },
    ],
  };
  return renderVegaSpec(container, spec, { mode: 'vega' });
}
