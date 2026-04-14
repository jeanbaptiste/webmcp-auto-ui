// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, svgContent, bounds, opacity = 0.8 } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (svgContent && bounds) {
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.innerHTML = svgContent;
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgElement.setAttribute('viewBox', '0 0 200 200');
    L.svgOverlay(svgElement, bounds, { opacity }).addTo(map);
    map.fitBounds(bounds);
  }

  return () => { map.remove(); };
}
