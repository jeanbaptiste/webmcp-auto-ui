// ---------------------------------------------------------------------------
// mapbox-3d — 3D buildings and terrain visualization
// ---------------------------------------------------------------------------

let cssInjected = false;

function injectCss(): void {
  if (cssInjected) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css';
  document.head.appendChild(link);
  cssInjected = true;
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): (() => void) {
  const accessToken = data.accessToken as string | undefined;
  if (!accessToken) {
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:400px;color:#ef4444;font-family:system-ui,sans-serif;">Mapbox access token required</div>';
    return () => {};
  }

  container.style.minHeight = '400px';
  container.style.position = 'relative';
  injectCss();

  const mapDiv = document.createElement('div');
  mapDiv.style.cssText = 'width:100%;height:100%;min-height:400px;';
  container.appendChild(mapDiv);

  const center = data.center as [number, number];
  const zoom = (data.zoom as number) ?? 15;
  const pitch = (data.pitch as number) ?? 60;
  const bearing = (data.bearing as number) ?? -17.6;
  const terrain = (data.terrain as boolean) ?? true;
  const buildings3d = (data.buildings3d as boolean) ?? true;
  const style = (data.style as string) ?? 'mapbox://styles/mapbox/dark-v11';

  let map: mapboxgl.Map | null = null;

  import('mapbox-gl').then((mapboxgl) => {
    (mapboxgl as any).accessToken = accessToken;

    map = new mapboxgl.Map({
      container: mapDiv,
      style,
      center,
      zoom,
      pitch,
      bearing,
      antialias: true,
    });

    map.on('load', () => {
      if (!map) return;

      // Add terrain
      if (terrain) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      }

      // Add 3D buildings
      if (buildings3d) {
        const layers = map.getStyle().layers ?? [];
        // Find the first symbol layer to insert buildings beneath labels
        let labelLayerId: string | undefined;
        for (const layer of layers) {
          if (layer.type === 'symbol' && (layer as any).layout?.['text-field']) {
            labelLayerId = layer.id;
            break;
          }
        }

        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6,
            },
          },
          labelLayerId,
        );
      }
    });

    // Navigation controls
    map.addControl(new mapboxgl.NavigationControl());
  });

  return () => {
    map?.remove();
  };
}
