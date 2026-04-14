// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 5, geojson, valueProperty = 'value', steps = 6, colors = ['#ffffcc', '#c7e9b4', '#7fcdbb', '#41b6c4', '#2c7fb8', '#253494'], legend = true } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (geojson) {
    // Extract values to compute thresholds
    const values = geojson.features
      .map((f: any) => f.properties?.[valueProperty])
      .filter((v: any) => typeof v === 'number');
    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = (max - min) / steps;

    function getColor(val: number) {
      for (let i = 0; i < steps; i++) {
        if (val <= min + step * (i + 1)) return colors[i] || colors[colors.length - 1];
      }
      return colors[colors.length - 1];
    }

    L.geoJSON(geojson, {
      style: (feature: any) => ({
        fillColor: getColor(feature.properties?.[valueProperty] ?? 0),
        weight: 1,
        opacity: 1,
        color: '#666',
        fillOpacity: 0.7,
      }),
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties) {
          const name = feature.properties.name || feature.properties.NAME || '';
          const val = feature.properties[valueProperty] ?? '';
          layer.bindPopup(`<strong>${name}</strong><br/>${valueProperty}: ${val}`);
        }
      },
    }).addTo(map);

    // Legend
    if (legend) {
      const legendCtrl = (L as any).control({ position: 'bottomright' });
      legendCtrl.onAdd = () => {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.cssText = 'background:white;padding:8px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
        for (let i = 0; i < steps; i++) {
          const from = Math.round(min + step * i);
          const to = Math.round(min + step * (i + 1));
          div.innerHTML += `<i style="background:${colors[i]};width:14px;height:14px;display:inline-block;margin-right:4px;"></i> ${from}&ndash;${to}<br>`;
        }
        return div;
      };
      legendCtrl.addTo(map);
    }

    map.fitBounds(L.geoJSON(geojson).getBounds());
  }

  return () => { map.remove(); };
}
