// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, extent, projection = 'EPSG:4326', center, zoom = 2 } = (data ?? {}) as any;
  if (!url || !extent) {
    return renderEmpty(container, 'openlayers-image-static', 'Pass `url` (image) and `extent: [minX, minY, maxX, maxY]`.');
  }
  const ImageLayer = (await import('ol/layer/Image')).default;
  const Static = (await import('ol/source/ImageStatic')).default;
  const View = (await import('ol/View')).default;
  const Map = (await import('ol/Map')).default;

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';

  const layer = new ImageLayer({
    source: new Static({ url, projection, imageExtent: extent }),
  });
  const map = new Map({
    target: container,
    layers: [layer],
    view: new View({
      projection,
      center: center ?? [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2],
      zoom,
    }),
  });
  const ro = new ResizeObserver(() => map.updateSize());
  ro.observe(container);
  return () => {
    ro.disconnect();
    map.setTarget(null);
  };
}
