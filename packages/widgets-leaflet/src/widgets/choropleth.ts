// ---------------------------------------------------------------------------
// choropleth — GeoJSON regions colored by value with legend
// ---------------------------------------------------------------------------

import L from 'leaflet';
import { injectLeafletCSS, ensureHeight, TILE_URL, TILE_ATTR } from './shared.js';

// ---------------------------------------------------------------------------
// Color scales — each is a 5-stop gradient from light to dark
// ---------------------------------------------------------------------------

const SCALES: Record<string, string[]> = {
  blues:   ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
  reds:    ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
  greens:  ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
  oranges: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
  purples: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
  viridis: ['#fde725', '#5ec962', '#21918c', '#3b528b', '#440154'],
};

function getColor(value: number, min: number, max: number, scale: string[]): string {
  if (max === min) return scale[2];
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const idx = Math.min(Math.floor(t * scale.length), scale.length - 1);
  return scale[idx];
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  injectLeafletCSS(container);
  ensureHeight(container, data.height as string | undefined);

  const geojson = data.geojson as GeoJSON.FeatureCollection;
  const values = data.values as Record<string, number>;
  const valueKey = (data.valueKey as string) ?? 'name';
  const scaleName = (data.colorScale as string) ?? 'blues';
  const scale = SCALES[scaleName] ?? SCALES.blues;
  const title = data.title as string | undefined;

  // Compute min/max
  const nums = Object.values(values);
  const min = Math.min(...nums);
  const max = Math.max(...nums);

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;position:relative;';

  if (title) {
    const h = document.createElement('div');
    h.style.cssText =
      'font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;padding:8px 12px 4px;';
    h.textContent = title;
    wrapper.appendChild(h);
  }

  const mapDiv = document.createElement('div');
  mapDiv.style.cssText = 'flex:1;min-height:0;';
  wrapper.appendChild(mapDiv);
  container.appendChild(wrapper);

  const map = L.map(mapDiv).setView([46.5, 2.5], 6); // France center default
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map);

  // GeoJSON layer
  const geoLayer = L.geoJSON(geojson, {
    style: (feature) => {
      const key = feature?.properties?.[valueKey] as string ?? '';
      const val = values[key];
      return {
        fillColor: val !== undefined ? getColor(val, min, max, scale) : '#ccc',
        weight: 1,
        opacity: 1,
        color: '#666',
        fillOpacity: 0.75,
      };
    },
    onEachFeature: (feature, layer) => {
      const key = feature.properties?.[valueKey] as string ?? '';
      const val = values[key];
      if (val !== undefined) {
        layer.bindTooltip(`${key}: ${val}`, { sticky: true });
      }
    },
  }).addTo(map);

  // Fit bounds to GeoJSON
  const bounds = geoLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
  }

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText =
    'position:absolute;bottom:30px;right:16px;z-index:1000;background:rgba(255,255,255,0.92);' +
    'border-radius:6px;padding:8px 12px;font-family:ui-monospace,monospace;font-size:10px;' +
    'box-shadow:0 1px 4px rgba(0,0,0,0.2);pointer-events:none;';

  const gradient = scale.map((c, i) => `${c} ${(i / (scale.length - 1)) * 100}%`).join(', ');
  legend.innerHTML =
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px;">` +
    `<span>${min}</span><span>${max}</span></div>` +
    `<div style="height:10px;border-radius:3px;background:linear-gradient(to right,${gradient});"></div>`;
  wrapper.appendChild(legend);

  return () => { map.remove(); };
}
