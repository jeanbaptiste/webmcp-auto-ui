// @ts-nocheck
import { embedSpec, toValues, inferType } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, fontSize } = data as any;
  const values = toValues(data);
  const xType = inferType(values[0]?.x);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'text', tooltip: true, color, fontSize: fontSize ?? 11 },
    encoding: {
      x: { field: 'x', type: xType, title: xLabel ?? null },
      y: { field: 'y', type: 'quantitative', title: yLabel ?? null },
      text: { field: 'text', type: 'nominal' },
    },
  };
  return embedSpec(container, spec);
}
