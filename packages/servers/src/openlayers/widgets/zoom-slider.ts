// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { center, zoom } = (data ?? {}) as any;
  const ZoomSlider = (await import('ol/control/ZoomSlider')).default;
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addControl(new ZoomSlider());
  return cleanup;
}
