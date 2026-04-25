// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { center, zoom, units = 'metric' } = (data ?? {}) as any;
  const ScaleLine = (await import('ol/control/ScaleLine')).default;
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addControl(new ScaleLine({ units }));
  return cleanup;
}
