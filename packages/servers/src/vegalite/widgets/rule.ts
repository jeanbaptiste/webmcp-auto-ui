// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, xLabel, yLabel, color, orientation } = data as any;
  const values = toValues(data);
  const horizontal = orientation === 'h';
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'rule', tooltip: true, color, strokeWidth: 2 },
    encoding: horizontal
      ? { y: { field: 'y', type: 'quantitative', title: yLabel ?? null } }
      : { x: { field: 'x', type: 'quantitative', title: xLabel ?? null } },
  };
  return embedSpec(container, spec);
}
