// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const trips = (data as any).trips ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(trips) || !trips.length) {
    return renderEmpty(container, 'deckgl-trips', 'Provide <code>{trips: [{path: [[lng,lat], ...], timestamps: [t0, t1, ...], color?}]}</code>.');
  }
  const first = trips[0];
  const firstCoord = Array.isArray(first?.path) ? first.path[0] : null;
  const { center = firstCoord ?? [0, 0], zoom = 12, style, pitch = 45, color, trailLength = 180, animationSpeed = 1 } = data as any;
  const fb = toRGBA(color, [253, 128, 93, 255]);

  // Compute time range
  let minT = Infinity;
  let maxT = -Infinity;
  for (const t of trips) {
    const ts = t.timestamps ?? [];
    for (const v of ts) {
      if (v < minT) minT = v;
      if (v > maxT) maxT = v;
    }
  }
  if (!isFinite(minT)) {
    minT = 0;
    maxT = 100;
  }
  const span = maxT - minT;

  const { TripsLayer } = await import('@deck.gl/geo-layers');

  let raf = 0;
  let currentTime = 0;
  let overlayRef: any = null;
  const buildLayer = () =>
    new TripsLayer({
      id: 'trips',
      data: trips,
      getPath: (d: any) => d.path,
      getTimestamps: (d: any) => d.timestamps,
      getColor: (d: any) => (d.color ? toRGBA(d.color, fb) : fb),
      getWidth: (d: any) => d.width ?? 4,
      currentTime,
      trailLength,
      capRounded: true,
      jointRounded: true,
      widthMinPixels: 2,
    });

  const { overlay, cleanup } = await createDeckMap(container, {
    center,
    zoom,
    style,
    pitch,
    layers: [buildLayer()],
  });
  overlayRef = overlay;

  const start = performance.now();
  const animate = () => {
    const elapsed = (performance.now() - start) / 1000;
    currentTime = minT + ((elapsed * animationSpeed * span) / 30) % span;
    overlayRef.setProps({ layers: [buildLayer()] });
    raf = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    cancelAnimationFrame(raf);
    cleanup();
  };
}
