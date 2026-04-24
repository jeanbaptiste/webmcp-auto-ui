// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, extent } = data as any;
  const values = toValues(data);
  // expects rows with {x, y} — aggregates errorbars; or {x, yMin, yMax}
  const hasBounds = values[0]?.yMin !== undefined && values[0]?.yMax !== undefined;
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'errorbar', extent: extent ?? 'ci', color, ticks: true },
    encoding: hasBounds
      ? {
          x: { field: 'x', type: 'nominal', title: xLabel ?? null },
          y: { field: 'yMin', type: 'quantitative', title: yLabel ?? null },
          y2: { field: 'yMax' },
        }
      : {
          x: { field: 'x', type: 'nominal', title: xLabel ?? null },
          y: { field: 'y', type: 'quantitative', title: yLabel ?? null },
        },
  };
  return embedSpec(container, spec);
}
