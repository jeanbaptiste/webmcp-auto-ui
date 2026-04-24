// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { z = [], xLabels, yLabels, title, scheme = 'viridis' } = data as any;
  const values: any[] = [];
  for (let i = 0; i < z.length; i++) {
    for (let j = 0; j < (z[i]?.length ?? 0); j++) {
      values.push({
        x: xLabels?.[j] ?? j,
        y: yLabels?.[i] ?? i,
        v: z[i][j],
      });
    }
  }
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values },
    mark: { type: 'rect' },
    encoding: {
      x: { field: 'x', type: 'ordinal', sort: null },
      y: { field: 'y', type: 'ordinal', sort: null },
      color: { field: 'v', type: 'quantitative', scale: { scheme } },
      tooltip: [{ field: 'x' }, { field: 'y' }, { field: 'v' }],
    },
  };
  return renderVegaSpec(container, spec, { mode: 'vega-lite' });
}
