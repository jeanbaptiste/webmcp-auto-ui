// @ts-nocheck
import { embedSpec, toValues, inferType } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color } = data as any;
  const values = toValues(data);
  const xType = inferType(values[0]?.x);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'tick', tooltip: true, color },
    encoding: {
      x: { field: 'x', type: xType === 'quantitative' ? 'quantitative' : xType, title: xLabel ?? null },
      y: { field: 'y', type: 'nominal', title: yLabel ?? null },
    },
  };
  return embedSpec(container, spec);
}
