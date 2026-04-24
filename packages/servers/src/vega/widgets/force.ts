// @ts-nocheck
import { renderVegaSpec } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { nodes = [], links = [], title, height = 400 } = data as any;
  // Vega full spec for a force-directed layout
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 600,
    height,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    title,
    padding: 0,
    signals: [
      { name: 'cx', update: 'width / 2' },
      { name: 'cy', update: 'height / 2' },
    ],
    data: [
      { name: 'node-data', values: nodes },
      { name: 'link-data', values: links },
    ],
    scales: [
      { name: 'color', type: 'ordinal', domain: { data: 'node-data', field: 'group' }, range: { scheme: 'category10' } },
    ],
    marks: [
      {
        name: 'nodes',
        type: 'symbol',
        zindex: 1,
        from: { data: 'node-data' },
        encode: {
          enter: {
            fill: { scale: 'color', field: 'group' },
            stroke: { value: '#fff' },
          },
          update: {
            size: { value: 80 },
            cursor: { value: 'pointer' },
          },
        },
        transform: [
          {
            type: 'force',
            iterations: 300,
            static: false,
            forces: [
              { force: 'center', x: { signal: 'cx' }, y: { signal: 'cy' } },
              { force: 'collide', radius: 6 },
              { force: 'nbody', strength: -30 },
              { force: 'link', links: 'link-data', distance: 30 },
            ],
          },
        ],
      },
      {
        type: 'path',
        from: { data: 'link-data' },
        interactive: false,
        encode: {
          update: {
            stroke: { value: '#999' },
            strokeWidth: { value: 0.5 },
          },
        },
        transform: [
          {
            type: 'linkpath',
            require: { signal: 'force' },
            shape: 'line',
            sourceX: 'datum.source.x',
            sourceY: 'datum.source.y',
            targetX: 'datum.target.x',
            targetY: 'datum.target.y',
          },
        ],
      },
    ],
  };
  return renderVegaSpec(container, spec, { mode: 'vega' });
}
