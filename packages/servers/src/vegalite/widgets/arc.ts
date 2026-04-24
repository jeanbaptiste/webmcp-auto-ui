// @ts-nocheck
import { embedSpec, toValues } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, innerRadius, scheme } = data as any;
  const values = toValues(data);
  const spec: any = {
    title,
    data: { values },
    mark: { type: 'arc', tooltip: true, innerRadius: innerRadius ?? 0, outerRadius: 120 },
    encoding: {
      theta: { field: 'value', type: 'quantitative', stack: true },
      color: { field: 'label', type: 'nominal', scale: scheme ? { scheme } : undefined },
    },
  };
  return embedSpec(container, spec);
}
