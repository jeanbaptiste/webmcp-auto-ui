// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

// groups: { A: [values...], B: [values...] }
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { groups = {}, title, xLabel, yLabel } = data as any;
  const values: any[] = [];
  for (const [g, arr] of Object.entries(groups)) {
    for (const v of arr as number[]) values.push({ group: g, value: v });
  }
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values },
    mark: { type: 'area', orient: 'horizontal' },
    transform: [
      {
        density: 'value',
        groupby: ['group'],
        as: ['value', 'density'],
        extent: { signal: 'extent' },
      },
    ],
    encoding: {
      y: { field: 'value', type: 'quantitative', title: yLabel },
      color: { field: 'group', type: 'nominal', legend: null },
      column: { field: 'group', type: 'nominal', title: xLabel, header: { labelOrient: 'bottom' } },
      x: { field: 'density', type: 'quantitative', stack: 'center', impute: null, title: null, axis: { labels: false, ticks: false, grid: false } },
    },
    config: { view: { stroke: null } },
  };
  return renderVegaSpec(container, spec, { mode: 'vega-lite' });
}
