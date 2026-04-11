// ---------------------------------------------------------------------------
// heatmap-geo — Geographic heatmap with canvas overlay (no external plugin)
// ---------------------------------------------------------------------------

import L from 'leaflet';
import { injectLeafletCSS, ensureHeight, TILE_URL, TILE_ATTR } from './shared.js';

interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  injectLeafletCSS(container);
  ensureHeight(container, data.height as string | undefined);

  const points = (data.points as HeatPoint[]) ?? [];
  const radius = (data.radius as number) ?? 25;
  const maxOpacity = (data.opacity as number) ?? 0.6;
  const title = data.title as string | undefined;

  // Normalize intensities
  const maxIntensity = Math.max(...points.map(p => p.intensity), 1);

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

  // Auto-center on points
  let center: [number, number] = [48.8566, 2.3522];
  let zoom = 13;
  if (points.length > 0) {
    const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    center = [avgLat, avgLng];
  }

  const map = L.map(mapDiv).setView(center, zoom);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map);

  // Fit bounds if multiple points
  if (points.length > 1) {
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  // Canvas overlay for heatmap
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:450;pointer-events:none;';

  // Add canvas to the overlay pane
  const pane = map.getPane('overlayPane');
  if (pane) pane.appendChild(canvas);

  function drawHeat(): void {
    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw intensity circles
    for (const p of points) {
      const pt = map.latLngToContainerPoint([p.lat, p.lng]);
      const intensity = Math.min(p.intensity / maxIntensity, 1);

      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      grad.addColorStop(0, `rgba(255, 0, 0, ${intensity * maxOpacity})`);
      grad.addColorStop(0.4, `rgba(255, 80, 0, ${intensity * maxOpacity * 0.6})`);
      grad.addColorStop(0.7, `rgba(255, 200, 0, ${intensity * maxOpacity * 0.3})`);
      grad.addColorStop(1, 'rgba(255, 255, 0, 0)');

      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Position canvas relative to map origin
    const origin = map.getPixelOrigin();
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);
  }

  drawHeat();
  map.on('moveend zoomend', drawHeat);
  map.on('resize', drawHeat);

  return () => {
    map.off('moveend zoomend', drawHeat);
    map.off('resize', drawHeat);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    map.remove();
  };
}
