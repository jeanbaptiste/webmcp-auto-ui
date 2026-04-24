// @ts-nocheck
import { embedSpec } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { title, direction, specs } = data as any;
  const key = direction === 'vertical' ? 'vconcat' : direction === 'horizontal' ? 'hconcat' : 'concat';
  const spec: any = { title, [key]: Array.isArray(specs) ? specs : [] };
  return embedSpec(container, spec);
}
