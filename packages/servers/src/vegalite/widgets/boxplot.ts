// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, extent } = data as any;
  const values = toValues(data);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'boxplot', extent: extent ?? 1.5, color },
    encoding: {
      x: { field: 'x', type: 'nominal', title: xLabel ?? null },
      y: { field: 'y', type: 'quantitative', title: yLabel ?? null },
    },
  };
  if (values[0]?.series !== undefined) {
    spec.encoding.color = { field: 'series', type: 'nominal' };
  }
  return embedSpec(container, spec);
}
