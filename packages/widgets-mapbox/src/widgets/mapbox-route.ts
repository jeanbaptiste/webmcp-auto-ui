// ---------------------------------------------------------------------------
// mapbox-route — Route line drawn between waypoints
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

  const waypoints = (data.waypoints as Array<{ lng: number; lat: number }>) ?? [];
  if (waypoints.length < 2) {
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:400px;color:#ef4444;font-family:system-ui,sans-serif;">At least 2 waypoints required</div>';
    return () => {};
  }

  container.style.minHeight = '400px';
  container.style.position = 'relative';
  injectCss();

  const mapDiv = document.createElement('div');
  mapDiv.style.cssText = 'width:100%;height:100%;min-height:400px;';
  container.appendChild(mapDiv);

  const lineColor = (data.lineColor as string) ?? '#4264fb';
  const lineWidth = (data.lineWidth as number) ?? 4;
  const style = (data.style as string) ?? 'mapbox://styles/mapbox/dark-v11';
  const explicitZoom = data.zoom as number | undefined;

  let map: mapboxgl.Map | null = null;

  import('mapbox-gl').then((mapboxgl) => {
    (mapboxgl as any).accessToken = accessToken;

    // Compute bounds from waypoints
    const bounds = new mapboxgl.LngLatBounds();
    for (const wp of waypoints) {
      bounds.extend([wp.lng, wp.lat]);
    }

    map = new mapboxgl.Map({
      container: mapDiv,
      style,
      ...(explicitZoom != null
        ? { center: bounds.getCenter(), zoom: explicitZoom }
        : {}),
    });

    if (explicitZoom == null) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }

    map.on('load', () => {
      if (!map) return;

      const coordinates = waypoints.map((wp) => [wp.lng, wp.lat] as [number, number]);

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': lineColor,
          'line-width': lineWidth,
        },
      });

      // Add circle markers at each waypoint
      map.addSource('waypoints', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: waypoints.map((wp, i) => ({
            type: 'Feature' as const,
            properties: { index: i },
            geometry: {
              type: 'Point' as const,
              coordinates: [wp.lng, wp.lat],
            },
          })),
        },
      });

      map.addLayer({
        id: 'waypoint-circles',
        type: 'circle',
        source: 'waypoints',
        paint: {
          'circle-radius': 6,
          'circle-color': lineColor,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });
    });

    map.addControl(new mapboxgl.NavigationControl());
  });

  return () => {
    map?.remove();
  };
}
