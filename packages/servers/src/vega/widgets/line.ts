// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { x = [], y = [], title, xLabel, yLabel, color, interpolate = 'linear' } = data as any;
  const values = x.map((xv: any, i: number) => ({ x: xv, y: y[i] }));
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values },
    mark: { type: 'line', interpolate, color: typeof color === 'string' ? color : undefined, point: true },
    encoding: {
      x: { field: 'x', type: typeof (x[0]) === 'number' ? 'quantitative' : 'ordinal', title: xLabel },
      y: { field: 'y', type: 'quantitative', title: yLabel },
    },
  };
  return renderVegaSpec(container, spec, { mode: 'vega-lite' });
}
