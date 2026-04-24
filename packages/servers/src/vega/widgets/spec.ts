// @ts-nocheck
import { renderVegaSpec } from './shared.js';

/**
 * Generic Vega spec renderer. Accepts a full Vega (or Vega-Lite) JSON spec.
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { spec, mode } = data as any;
  if (!spec || typeof spec !== 'object') {
    container.textContent = 'vega-spec: missing required "spec" object';
    return () => {};
  }
  return renderVegaSpec(container, spec, { mode });
}
