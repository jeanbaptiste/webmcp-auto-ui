// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { x = [], y = [], title, xLabel, yLabel, bandwidth = 20 } = data as any;
  const values = x.map((xv: any, i: number) => ({ x: xv, y: y[i] }));
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values },
    layer: [
      {
        mark: { type: 'circle', opacity: 0.4, color: '#4c78a8', size: 18 },
        encoding: {
          x: { field: 'x', type: 'quantitative', title: xLabel },
          y: { field: 'y', type: 'quantitative', title: yLabel },
        },
      },
      {
        transform: [
          { density: 'x', groupby: ['__none__'], as: ['value', 'density'] },
        ],
        mark: { type: 'area', color: '#4c78a8', opacity: 0.15 },
        encoding: {
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
        },
      },
    ],
  };
  // Simpler fallback: just a 2D density via contour mark via vega-lite extension isn't built-in
  // Use Vega full spec with contour transform
  const vegaSpec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 600,
    height: 400,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    title,
    padding: 5,
    data: [
      { name: 'points', values },
      {
        name: 'contours',
        source: 'points',
        transform: [
          {
            type: 'contour',
            x: { expr: "scale('x', datum.x)" },
            y: { expr: "scale('y', datum.y)" },
            size: [{ signal: 'width' }, { signal: 'height' }],
            bandwidth: [bandwidth, bandwidth],
          },
        ],
      },
    ],
    scales: [
      { name: 'x', type: 'linear', domain: { data: 'points', field: 'x' }, range: 'width', nice: true },
      { name: 'y', type: 'linear', domain: { data: 'points', field: 'y' }, range: 'height', nice: true },
      { name: 'color', type: 'linear', domain: { data: 'contours', field: 'value' }, range: { scheme: 'blues' } },
    ],
    axes: [
      { scale: 'x', orient: 'bottom', title: xLabel },
      { scale: 'y', orient: 'left', title: yLabel },
    ],
    marks: [
      {
        type: 'path',
        from: { data: 'contours' },
        encode: {
          enter: {
            stroke: { value: '#888' },
            strokeWidth: { value: 0.5 },
            fill: { scale: 'color', field: 'value' },
            fillOpacity: { value: 0.5 },
          },
        },
        transform: [{ type: 'geopath', field: 'datum' }],
      },
      {
        type: 'symbol',
        from: { data: 'points' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'x' },
            y: { scale: 'y', field: 'y' },
            size: { value: 14 },
            fill: { value: '#222' },
            fillOpacity: { value: 0.5 },
          },
        },
      },
    ],
  };
  void spec;
  return renderVegaSpec(container, vegaSpec, { mode: 'vega' });
}
