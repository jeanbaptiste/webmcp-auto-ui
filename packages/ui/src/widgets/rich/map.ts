/**
 * Vanilla renderer for MapView widget (Leaflet, dark basemap).
 *
 * Contract:
 *   render(container, spec) => Promise<cleanup>
 *
 * Leaflet is lazy-loaded via dynamic import so this widget costs nothing
 * until actually mounted. The cleanup function calls `map.remove()` to
 * release Leaflet's DOM listeners, then clears the container.
 *
 * Events:
 *   click on marker -> CustomEvent('widget:interact', {
 *     detail: { action: 'markerclick', payload: marker },
 *     bubbles: true
 *   })
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

export interface MapSpec {
  title?: string;
  center?: LatLng;
  zoom?: number;
  height?: string;
  markers?: MapMarker[];
}

function markerColor(color?: string): string {
  return color ?? 'var(--color-accent)';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function render(
  container: HTMLElement,
  data: Partial<MapSpec> | undefined
): Promise<() => void> {
  const spec: Partial<MapSpec> = data ?? {};

  // Build static chrome (wrapper + optional title + map host + optional marker count).
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';

  if (spec.title) {
    const h3 = document.createElement('h3');
    h3.className = 'text-sm font-semibold text-text1 mb-3';
    h3.textContent = spec.title;
    wrapper.appendChild(h3);
  }

  const mapHost = document.createElement('div');
  mapHost.className = 'rounded overflow-hidden border border-border';
  mapHost.style.height = spec.height ?? '400px';
  mapHost.setAttribute('role', 'region');
  mapHost.setAttribute('aria-label', spec.title ?? 'Carte');

  // Loader placeholder while Leaflet is being fetched.
  const loader = document.createElement('div');
  loader.className =
    'w-full h-full bg-bg flex flex-col items-center justify-center text-text2 text-sm gap-2';
  loader.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-1.447-.894L15 12m0 8V12M9 7l6-2.5"/>
    </svg>
    <span class="font-mono text-xs">Chargement de la carte…</span>
  `;
  mapHost.appendChild(loader);
  wrapper.appendChild(mapHost);

  const markers = spec.markers ?? [];
  if (markers.length) {
    const count = document.createElement('div');
    count.className = 'mt-2 text-xs text-text2 font-mono';
    count.textContent = `${markers.length} marqueur${markers.length > 1 ? 's' : ''}`;
    wrapper.appendChild(count);
  }

  container.appendChild(wrapper);

  // Inject tooltip styles once (Svelte version used :global CSS).
  if (!document.getElementById('mapview-tooltip-style')) {
    const style = document.createElement('style');
    style.id = 'mapview-tooltip-style';
    style.textContent = `
      .mapview-tooltip {
        background: var(--color-surface2);
        border: 1px solid var(--color-border);
        color: var(--color-text1);
        font-size: 11px;
        font-family: ui-monospace, monospace;
        border-radius: 4px;
        padding: 2px 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      }
      .mapview-tooltip::before {
        border-top-color: var(--color-border);
      }
      .leaflet-container {
        background: var(--color-bg);
      }
    `;
    document.head.appendChild(style);
  }

  let cancelled = false;
  let mapInstance: any = null;

  // Lazy-load Leaflet + its CSS. Keep this exact shape: dispatcher awaits us.
  const leafletMod = await import('leaflet');
  // @ts-ignore — CSS import handled by Vite.
  await import('leaflet/dist/leaflet.css');

  if (cancelled) {
    // Cleanup fired before Leaflet finished loading.
    return () => {};
  }

  const L: any = (leafletMod as any).default ?? leafletMod;

  // Clear loader now that Leaflet is ready.
  mapHost.innerHTML = '';

  const center: [number, number] = spec.center
    ? [spec.center.lat, spec.center.lng]
    : [46.6, 2.3];

  const map = L.map(mapHost, {
    center,
    zoom: spec.zoom ?? 6,
    zoomControl: true,
    attributionControl: true,
  });
  mapInstance = map;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  for (const marker of markers) {
    const cm = L.circleMarker([marker.lat, marker.lng], {
      radius: 7,
      color: markerColor(marker.color),
      fillColor: markerColor(marker.color),
      fillOpacity: 0.85,
      weight: 1.5,
    }).addTo(map);

    if (marker.label) {
      cm.bindTooltip(escapeHtml(marker.label), {
        direction: 'top',
        offset: L.point(0, -8),
        className: 'mapview-tooltip',
      });
    }

    cm.on('click', () => {
      container.dispatchEvent(
        new CustomEvent('widget:interact', {
          detail: { action: 'markerclick', payload: marker },
          bubbles: true,
        })
      );
    });
  }

  // Optional PNG export hook. Best-effort rasterization of the current map tiles.
  // Leaflet tiles are cross-origin, so a full-fidelity export would require
  // leaflet-image + proxied tiles. We expose a no-op-ish stub that returns the
  // map container as a data-url via html-to-canvas if available, else null.
  (container as any).__exportPng = async (): Promise<string | null> => {
    try {
      // @ts-ignore — optional dependency, may be absent.
      const mod = await import('html-to-image').catch(() => null);
      if (!mod || !mapHost) return null;
      return await mod.toPng(mapHost, { pixelRatio: 2 });
    } catch {
      return null;
    }
  };

  return () => {
    cancelled = true;
    try {
      if (mapInstance) mapInstance.remove();
    } catch {
      /* swallow — Leaflet may already be torn down */
    }
    mapInstance = null;
    try {
      delete (container as any).__exportPng;
    } catch {
      /* ignore */
    }
    container.innerHTML = '';
  };
}
