// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color } = data as any;
  const values = toValues(data);
  // Vega-Lite has no native "violin" mark — emulate via density transform + area mark.
  const spec: any = {
    title,
    data: { values },
    transform: [
      { density: 'y', groupby: ['x'], extent: null, as: ['value', 'density'] },
    ],
    mark: { type: 'area', orient: 'horizontal', color },
    encoding: {
      y: { field: 'value', type: 'quantitative', title: yLabel ?? null },
      x: {
        field: 'density',
        type: 'quantitative',
        stack: 'center',
        axis: null,
        impute: null,
      },
      column: { field: 'x', type: 'nominal', title: xLabel ?? null, header: { labelOrient: 'bottom' } },
    },
  };
  return embedSpec(container, spec);
}
