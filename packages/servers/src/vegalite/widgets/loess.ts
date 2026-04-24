// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, bandwidth } = data as any;
  const values = toValues(data);
  const spec: any = {
    title,
    data: { values },
    layer: [
      {
        mark: { type: 'point', filled: true, opacity: 0.5, color },
        encoding: {
          x: { field: 'x', type: 'quantitative', title: xLabel ?? null },
          y: { field: 'y', type: 'quantitative', title: yLabel ?? null },
        },
      },
      {
        transform: [{ loess: 'y', on: 'x', bandwidth: bandwidth ?? 0.3 }],
        mark: { type: 'line', color: color ?? '#2ca02c', strokeWidth: 2 },
        encoding: {
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
        },
      },
    ],
  };
  return embedSpec(container, spec);
}
