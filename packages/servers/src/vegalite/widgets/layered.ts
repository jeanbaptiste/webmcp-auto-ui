// @ts-nocheck
import { embedSpec, toValues, inferType } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, marks } = data as any;
  const values = toValues(data);
  const xType = inferType(values[0]?.x);
  const list = Array.isArray(marks) && marks.length ? marks : ['line', 'point'];
  const spec: any = {
    title,
    data: { values },
    encoding: {
      x: { field: 'x', type: xType, title: xLabel ?? null },
      y: { field: 'y', type: 'quantitative', title: yLabel ?? null },
    },
    layer: list.map((m: string) => ({ mark: { type: m, tooltip: true, color, filled: true } })),
  };
  if (values[0]?.series !== undefined) {
    spec.encoding.color = { field: 'series', type: 'nominal' };
  }
  return embedSpec(container, spec);
}
