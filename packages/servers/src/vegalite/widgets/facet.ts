// @ts-nocheck
import { embedSpec, toValues, inferType } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, mark, facetField, columns } = data as any;
  const values = toValues(data);
  const xType = inferType(values[0]?.x);
  const spec: any = {
    title,
    data: { values },
    mark: { type: mark ?? 'line', tooltip: true, point: true },
    encoding: {
      x: { field: 'x', type: xType },
      y: { field: 'y', type: 'quantitative' },
      facet: { field: facetField ?? 'series', type: 'nominal', columns: columns ?? 3 },
    },
  };
  return embedSpec(container, spec);
}
