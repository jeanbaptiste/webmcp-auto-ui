// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, maxbins } = data as any;
  const values = toValues(data);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'bar', tooltip: true, color },
    encoding: {
      x: { field: 'value', type: 'quantitative', bin: { maxbins: maxbins ?? 30 }, title: xLabel ?? null },
      y: { aggregate: 'count', type: 'quantitative', title: yLabel ?? 'count' },
    },
  };
  if (values[0]?.series !== undefined) {
    spec.encoding.color = { field: 'series', type: 'nominal' };
  }
  return embedSpec(container, spec);
}
