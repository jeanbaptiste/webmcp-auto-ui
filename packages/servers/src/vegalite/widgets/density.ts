// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, bandwidth } = data as any;
  const values = toValues(data);
  const spec: any = {
    title,
    data: { values },
    transform: [
      { density: 'value', bandwidth: bandwidth ?? 0, as: ['value', 'density'] },
    ],
    mark: { type: 'area', color, opacity: 0.6, line: true },
    encoding: {
      x: { field: 'value', type: 'quantitative', title: xLabel ?? null },
      y: { field: 'density', type: 'quantitative', title: yLabel ?? 'density' },
    },
  };
  if (values[0]?.series !== undefined) {
    spec.transform[0].groupby = ['series'];
    spec.encoding.color = { field: 'series', type: 'nominal' };
  }
  return embedSpec(container, spec);
}
