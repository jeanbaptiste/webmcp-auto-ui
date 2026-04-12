// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 5, geojson, valueProperty = 'value', method = 'quantile', numClasses = 5, colorScheme = ['#edf8fb', '#b3cde3', '#8c96c6', '#8856a7', '#810f7c'] } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (geojson) {
    const values = geojson.features
      .map((f: any) => f.properties?.[valueProperty])
      .filter((v: any) => typeof v === 'number')
      .sort((a: number, b: number) => a - b);

    let breaks: number[] = [];
    if (method === 'quantile') {
      for (let i = 1; i <= numClasses; i++) {
        breaks.push(values[Math.floor((i / numClasses) * values.length) - 1] || values[values.length - 1]);
      }
    } else {
      // equal interval
      const min = values[0];
      const max = values[values.length - 1];
      const step = (max - min) / numClasses;
      for (let i = 1; i <= numClasses; i++) breaks.push(min + step * i);
    }

    function getColor(val: number) {
      for (let i = 0; i < breaks.length; i++) {
        if (val <= breaks[i]) return colorScheme[i] || colorScheme[colorScheme.length - 1];
      }
      return colorScheme[colorScheme.length - 1];
    }

    L.geoJSON(geojson, {
      style: (feature: any) => ({
        fillColor: getColor(feature.properties?.[valueProperty] ?? 0),
        weight: 1,
        color: '#333',
        fillOpacity: 0.7,
      }),
      onEachFeature: (feature: any, layer: any) => {
        const name = feature.properties?.name || '';
        const val = feature.properties?.[valueProperty] ?? '';
        layer.bindPopup(`<strong>${name}</strong><br/>${valueProperty}: ${val}`);
      },
    }).addTo(map);
  }

  return () => { map.remove(); };
}
