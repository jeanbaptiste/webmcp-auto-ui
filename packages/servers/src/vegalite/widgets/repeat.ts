// @ts-nocheck
import { embedSpec } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, values, fields, columns, mark } = data as any;
  const spec: any = {
    title,
    data: { values: values ?? [] },
    repeat: { row: fields, column: fields },
    spec: {
      mark: mark ?? { type: 'point', tooltip: true, filled: true, size: 40, opacity: 0.6 },
      encoding: {
        x: { field: { repeat: 'column' }, type: 'quantitative' },
        y: { field: { repeat: 'row' }, type: 'quantitative' },
        color: (data as any).colorField ? { field: (data as any).colorField, type: 'nominal' } : undefined,
      },
      width: 120,
      height: 120,
    },
  };
  if (columns) spec.columns = columns;
  return embedSpec(container, spec);
}
