// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { x = [], y = [], title, xLabel, yLabel, orientation = 'v', color } = data as any;
  const values = x.map((xv: any, i: number) => ({ x: xv, y: y[i] }));
  const isH = orientation === 'h';
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values },
    mark: { type: 'bar', color: typeof color === 'string' ? color : undefined },
    encoding: {
      x: isH
        ? { field: 'y', type: 'quantitative', title: xLabel }
        : { field: 'x', type: 'nominal', title: xLabel, sort: null },
      y: isH
        ? { field: 'x', type: 'nominal', title: yLabel, sort: null }
        : { field: 'y', type: 'quantitative', title: yLabel },
    },
  };
  return renderVegaSpec(container, spec, { mode: 'vega-lite' });
}
