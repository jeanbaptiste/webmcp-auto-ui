// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const geojson = (data as any).geojson ?? (data as any).data;
  if (!geojson || (geojson.type !== 'FeatureCollection' && geojson.type !== 'Feature')) {
    return renderEmpty(container, 'deckgl-geojson', 'Provide <code>{geojson: FeatureCollection, ...}</code>.');
  }
  const { center = [0, 20], zoom = 2, style, pitch = 0, extruded = false, fillColor, lineColor } = data as any;
  const fillFb = toRGBA(fillColor, [60, 140, 220, 150]);
  const lineFb = toRGBA(lineColor, [30, 50, 80, 220]);

  const { GeoJsonLayer } = await import('@deck.gl/layers');
  const layer = new GeoJsonLayer({
    id: 'geojson',
    data: geojson,
    pickable: true,
    stroked: true,
    filled: true,
    extruded,
    pointType: 'circle',
    lineWidthMinPixels: 1,
    pointRadiusMinPixels: 2,
    getFillColor: fillFb,
    getLineColor: lineFb,
    getElevation: (f: any) => f.properties?.elevation ?? 0,
    getPointRadius: (f: any) => f.properties?.radius ?? 100,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
