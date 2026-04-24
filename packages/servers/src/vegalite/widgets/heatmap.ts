// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, scheme } = data as any;
  const values = toValues(data);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'rect', tooltip: true },
    encoding: {
      x: { field: 'x', type: 'nominal', title: xLabel ?? null },
      y: { field: 'y', type: 'nominal', title: yLabel ?? null },
      color: { field: 'value', type: 'quantitative', scale: { scheme: scheme ?? 'viridis' } },
    },
  };
  return embedSpec(container, spec);
}
