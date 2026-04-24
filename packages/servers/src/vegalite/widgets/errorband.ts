// @ts-nocheck
import { embedSpec, toValues, inferType } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, extent } = data as any;
  const values = toValues(data);
  const xType = inferType(values[0]?.x);
  const hasBounds = values[0]?.yMin !== undefined && values[0]?.yMax !== undefined;
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'errorband', extent: extent ?? 'ci', color, borders: true, opacity: 0.3 },
    encoding: hasBounds
      ? {
          x: { field: 'x', type: xType, title: xLabel ?? null },
          y: { field: 'yMin', type: 'quantitative', title: yLabel ?? null },
          y2: { field: 'yMax' },
        }
      : {
          x: { field: 'x', type: xType, title: xLabel ?? null },
          y: { field: 'y', type: 'quantitative', title: yLabel ?? null },
        },
  };
  return embedSpec(container, spec);
}
