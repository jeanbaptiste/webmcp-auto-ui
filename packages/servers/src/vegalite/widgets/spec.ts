// @ts-nocheck
import { embedSpec } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { spec } = data as any;
  if (!spec || typeof spec !== 'object') {
    container.textContent = 'vegalite-spec: missing `spec` parameter';
    return () => {
      container.textContent = '';
    };
  }
  return embedSpec(container, spec);
}
