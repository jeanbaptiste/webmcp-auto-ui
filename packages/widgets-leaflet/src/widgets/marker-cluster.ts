// ---------------------------------------------------------------------------
// marker-cluster — Grid-based marker clustering (no external plugin)
// ---------------------------------------------------------------------------

import L from 'leaflet';
import { injectLeafletCSS, ensureHeight, TILE_URL, TILE_ATTR } from './shared.js';

interface MarkerDef {
  lat: number;
  lng: number;
  label?: string;
}

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  markers: MarkerDef[];
}

/**
 * Grid-based clustering: divides the visible area into cells of `gridSize` pixels
 * and groups all markers falling into the same cell.
 */
function computeClusters(
  map: L.Map,
  markers: MarkerDef[],
  gridSize: number,
): Cluster[] {
  const grid = new Map<string, Cluster>();

  for (const m of markers) {
    const pt = map.latLngToContainerPoint([m.lat, m.lng]);
    const gx = Math.floor(pt.x / gridSize);
    const gy = Math.floor(pt.y / gridSize);
    const key = `${gx}:${gy}`;

    if (!grid.has(key)) {
      grid.set(key, { lat: 0, lng: 0, count: 0, markers: [] });
    }
    const c = grid.get(key)!;
    c.markers.push(m);
    c.count++;
    // Running average for cluster center
    c.lat += (m.lat - c.lat) / c.count;
    c.lng += (m.lng - c.lng) / c.count;
  }

  return [...grid.values()];
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  injectLeafletCSS(container);
  ensureHeight(container, data.height as string | undefined);

  const markers = (data.markers as MarkerDef[]) ?? [];
  const gridSize = (data.gridSize as number) ?? 60;
  const title = data.title as string | undefined;

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';

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

  // Auto-center
  let center: [number, number] = [48.8566, 2.3522];
  if (markers.length > 0) {
    const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
    const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
    center = [avgLat, avgLng];
  }

  const map = L.map(mapDiv).setView(center, 13);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map);

  // Fit bounds
  if (markers.length > 1) {
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  // Cluster layer group
  let clusterGroup = L.layerGroup().addTo(map);

  // Inject cluster CSS
  const clusterStyle = document.createElement('style');
  clusterStyle.textContent = `
    .wl-cluster {
      display:flex;align-items:center;justify-content:center;
      border-radius:50%;color:#fff;font-weight:700;
      font-family:ui-monospace,monospace;font-size:12px;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;
      transition:transform 0.15s;
    }
    .wl-cluster:hover { transform:scale(1.15); }
    .wl-cluster-sm { background:rgba(51,136,255,0.8);width:32px;height:32px; }
    .wl-cluster-md { background:rgba(255,165,0,0.85);width:40px;height:40px;font-size:13px; }
    .wl-cluster-lg { background:rgba(220,53,69,0.85);width:48px;height:48px;font-size:14px; }
  `;
  container.prepend(clusterStyle);

  function updateClusters(): void {
    clusterGroup.clearLayers();

    const clusters = computeClusters(map, markers, gridSize);

    for (const c of clusters) {
      if (c.count === 1) {
        // Single marker — show as regular marker
        const m = c.markers[0];
        const marker = L.marker([m.lat, m.lng]).addTo(clusterGroup);
        if (m.label) {
          marker.bindTooltip(m.label);
          marker.bindPopup(m.label);
        }
      } else {
        // Cluster icon
        const sizeClass =
          c.count < 10 ? 'wl-cluster-sm' :
          c.count < 100 ? 'wl-cluster-md' :
          'wl-cluster-lg';

        const icon = L.divIcon({
          html: `<div class="wl-cluster ${sizeClass}">${c.count}</div>`,
          className: '', // avoid default leaflet-div-icon styles
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });

        const clusterMarker = L.marker([c.lat, c.lng], { icon }).addTo(clusterGroup);

        // Click to zoom into cluster
        clusterMarker.on('click', () => {
          const clusterBounds = L.latLngBounds(
            c.markers.map(m => [m.lat, m.lng] as [number, number]),
          );
          map.fitBounds(clusterBounds, { padding: [40, 40], maxZoom: 18 });
        });

        // Tooltip showing count
        clusterMarker.bindTooltip(`${c.count} markers`);
      }
    }
  }

  updateClusters();
  map.on('moveend zoomend', updateClusters);

  return () => {
    map.off('moveend zoomend', updateClusters);
    clusterGroup.clearLayers();
    map.remove();
  };
}
