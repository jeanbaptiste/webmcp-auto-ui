// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, method } = data as any;
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
        transform: [{ regression: 'y', on: 'x', method: method ?? 'linear' }],
        mark: { type: 'line', color: color ?? '#d62728', strokeWidth: 2 },
        encoding: {
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
        },
      },
    ],
  };
  return embedSpec(container, spec);
}
