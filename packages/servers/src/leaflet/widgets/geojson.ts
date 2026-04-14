// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 6, geojson, style, onEachFeature } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (geojson) {
    const defaultStyle = {
      color: '#3388ff',
      weight: 2,
      fillOpacity: 0.3,
    };
    const layer = L.geoJSON(geojson, {
      style: style || defaultStyle,
      onEachFeature: onEachFeature || ((feature: any, layer: any) => {
        if (feature.properties) {
          const html = Object.entries(feature.properties)
            .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
            .join('<br>');
          layer.bindPopup(html);
        }
      }),
    }).addTo(map);
    map.fitBounds(layer.getBounds());
  }

  return () => { map.remove(); };
}
