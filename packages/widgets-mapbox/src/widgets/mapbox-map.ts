// ---------------------------------------------------------------------------
// mapbox-map — Interactive vector map with markers
// ---------------------------------------------------------------------------

let cssInjected = false;

function injectCss(container: HTMLElement): void {
  if (cssInjected) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css';
  (container.getRootNode() as Document | ShadowRoot).appendChild
    ? document.head.appendChild(link)
    : document.head.appendChild(link);
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
  injectCss(container);

  const mapDiv = document.createElement('div');
  mapDiv.style.cssText = 'width:100%;height:100%;min-height:400px;';
  container.appendChild(mapDiv);

  const center = (data.center as [number, number]) ?? [0, 20];
  const zoom = (data.zoom as number) ?? 2;
  const style = (data.style as string) ?? 'mapbox://styles/mapbox/dark-v11';
  const markers = (data.markers as Array<{ lng: number; lat: number; label?: string; color?: string }>) ?? [];

  let map: mapboxgl.Map | null = null;
  const markerInstances: mapboxgl.Marker[] = [];

  import('mapbox-gl').then((mapboxgl) => {
    (mapboxgl as any).accessToken = accessToken;

    map = new mapboxgl.Map({
      container: mapDiv,
      style,
      center,
      zoom,
    });

    for (const m of markers) {
      const marker = new mapboxgl.Marker({ color: m.color ?? '#4264fb' })
        .setLngLat([m.lng, m.lat]);

      if (m.label) {
        marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(m.label));
      }

      marker.addTo(map);
      markerInstances.push(marker);
    }
  });

  return () => {
    for (const m of markerInstances) m.remove();
    map?.remove();
  };
}
