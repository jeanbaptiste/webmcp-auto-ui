// @ts-nocheck
import { embedSpec, toValues, inferType } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, stack, horizontal } = data as any;
  const values = toValues(data);
  const xType = inferType(values[0]?.x);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'bar', tooltip: true, color },
    encoding: horizontal
      ? {
          y: { field: 'x', type: 'nominal', title: xLabel ?? null, sort: null },
          x: { field: 'y', type: 'quantitative', title: yLabel ?? null, stack: stack ?? null },
        }
      : {
          x: { field: 'x', type: xType === 'temporal' ? 'temporal' : 'nominal', title: xLabel ?? null, sort: null },
          y: { field: 'y', type: 'quantitative', title: yLabel ?? null, stack: stack ?? null },
        },
  };
  if (values[0]?.series !== undefined) {
    spec.encoding.color = { field: 'series', type: 'nominal' };
  }
  return embedSpec(container, spec);
}
