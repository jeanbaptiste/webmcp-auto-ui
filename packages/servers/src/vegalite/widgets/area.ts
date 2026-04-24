// @ts-nocheck
import { embedSpec, toValues, inferType } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, stack, interpolate } = data as any;
  const values = toValues(data);
  const xType = inferType(values[0]?.x);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'area', tooltip: true, color, interpolate: interpolate ?? 'linear', opacity: 0.7 },
    encoding: {
      x: { field: 'x', type: xType, title: xLabel ?? null },
      y: { field: 'y', type: 'quantitative', title: yLabel ?? null, stack: stack ?? 'zero' },
    },
  };
  if (values[0]?.series !== undefined) {
    spec.encoding.color = { field: 'series', type: 'nominal' };
  }
  return embedSpec(container, spec);
}
