// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { center, zoom, projection = 'EPSG:4326', precision = 4 } = (data ?? {}) as any;
  const MousePosition = (await import('ol/control/MousePosition')).default;
  const { createStringXY } = await import('ol/coordinate');
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addControl(
    new MousePosition({
      coordinateFormat: createStringXY(precision),
      projection,
      className: 'ol-mouse-position',
    }),
  );
  return cleanup;
}
