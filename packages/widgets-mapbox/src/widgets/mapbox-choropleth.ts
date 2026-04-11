// ---------------------------------------------------------------------------
// mapbox-choropleth — Vector choropleth map colored by GeoJSON property
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

const DEFAULT_COLORS = ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'];

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

  const geojson = data.geojson as GeoJSON.FeatureCollection;
  const property = data.property as string;
  const colorScale = (data.colorScale as string[]) ?? DEFAULT_COLORS;
  const center = (data.center as [number, number]) ?? [0, 20];
  const zoom = (data.zoom as number) ?? 3;
  const opacity = (data.opacity as number) ?? 0.7;
  const extrude = (data.extrude as boolean) ?? false;

  let map: mapboxgl.Map | null = null;

  import('mapbox-gl').then((mapboxgl) => {
    (mapboxgl as any).accessToken = accessToken;

    map = new mapboxgl.Map({
      container: mapDiv,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom,
      pitch: extrude ? 45 : 0,
    });

    map.on('load', () => {
      if (!map) return;

      // Compute min/max from feature properties
      let min = Infinity;
      let max = -Infinity;
      for (const f of geojson.features) {
        const val = Number(f.properties?.[property]);
        if (!isNaN(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
      if (!isFinite(min)) { min = 0; max = 1; }

      map.addSource('choropleth', { type: 'geojson', data: geojson });

      // Build interpolation stops
      const stops: (string | number)[] = [];
      for (let i = 0; i < colorScale.length; i++) {
        stops.push(min + (i / (colorScale.length - 1)) * (max - min));
        stops.push(colorScale[i]);
      }

      if (extrude) {
        map.addLayer({
          id: 'choropleth-extrusion',
          type: 'fill-extrusion',
          source: 'choropleth',
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['get', property], ...stops],
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['get', property],
              min, 0,
              max, 50000,
            ],
            'fill-extrusion-opacity': opacity,
          },
        });
      } else {
        map.addLayer({
          id: 'choropleth-fill',
          type: 'fill',
          source: 'choropleth',
          paint: {
            'fill-color': ['interpolate', ['linear'], ['get', property], ...stops],
            'fill-opacity': opacity,
          },
        });
        map.addLayer({
          id: 'choropleth-outline',
          type: 'line',
          source: 'choropleth',
          paint: {
            'line-color': '#333',
            'line-width': 0.5,
          },
        });
      }
    });
  });

  return () => {
    map?.remove();
  };
}
