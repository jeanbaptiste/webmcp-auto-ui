// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { values = [], title, xLabel, yLabel = 'count', maxbins = 30, color } = data as any;
  const rows = (values as number[]).map((v) => ({ v }));
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values: rows },
    mark: { type: 'bar', color: typeof color === 'string' ? color : '#4c78a8' },
    encoding: {
      x: { field: 'v', bin: { maxbins }, type: 'quantitative', title: xLabel },
      y: { aggregate: 'count', type: 'quantitative', title: yLabel },
    },
  };
  return renderVegaSpec(container, spec, { mode: 'vega-lite' });
}
