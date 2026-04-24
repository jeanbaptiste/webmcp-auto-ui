// @ts-nocheck
import { renderVegaSpec } from './shared.js';

// Flat node list: [{ id, parent, name, size? }]
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { nodes = [], title } = data as any;
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 500,
    height: 500,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    title,
    padding: 5,
    data: [
      {
        name: 'tree',
        values: nodes,
        transform: [
          { type: 'stratify', key: 'id', parentKey: 'parent' },
          {
            type: 'partition',
            field: 'size',
            sort: { field: 'value' },
            size: [{ signal: '2 * PI' }, { signal: 'width / 2' }],
            as: ['a0', 'r0', 'a1', 'r1', 'depth', 'children'],
          },
        ],
      },
    ],
    scales: [
      { name: 'color', type: 'ordinal', domain: { data: 'tree', field: 'name' }, range: { scheme: 'tableau10' } },
    ],
    marks: [
      {
        type: 'arc',
        from: { data: 'tree' },
        encode: {
          enter: {
            x: { signal: 'width / 2' },
            y: { signal: 'height / 2' },
            fill: { scale: 'color', field: 'name' },
            stroke: { value: '#fff' },
            strokeWidth: { value: 0.5 },
            tooltip: { signal: "{ name: datum.name, size: datum.size }" },
          },
          update: {
            startAngle: { field: 'a0' },
            endAngle: { field: 'a1' },
            innerRadius: { field: 'r0' },
            outerRadius: { field: 'r1' },
          },
        },
      },
    ],
  };
  return renderVegaSpec(container, spec, { mode: 'vega' });
}
