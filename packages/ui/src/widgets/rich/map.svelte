<svelte:options customElement={{ tag: 'auto-map', shadow: 'none' }} />

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export interface MapMarker {
    lat: number;
    lon: number;
    label?: string;
    color?: string;
  }

  interface Props {
    markers?: MapMarker[];
    geojson?: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
    center?: [number, number];
    zoom?: number;
    height?: string;
  }

  let {
    markers = [],
    geojson = null,
    center,
    zoom,
    height = '400px',
  }: Props = $props();

  /** Light, free MapLibre style (Carto Positron, no API key). */
  const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  let containerEl: HTMLDivElement | undefined = $state();
  let map: any = null;
  let mountedMarkers: any[] = [];
  let destroyed = false;

  function isFiniteNum(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function sanitizeMarkers(raw: unknown): MapMarker[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((m) => {
      if (!m || typeof m !== 'object') return [];
      const o = m as Record<string, unknown>;
      if (!isFiniteNum(o.lat) || !isFiniteNum(o.lon)) return [];
      return [{
        lat: o.lat as number,
        lon: o.lon as number,
        label: typeof o.label === 'string' ? o.label : undefined,
        color: typeof o.color === 'string' ? o.color : undefined,
      }];
    });
  }

  const safeMarkers = $derived(sanitizeMarkers(markers));
  const hasData = $derived(safeMarkers.length > 0 || !!geojson);

  function buildPointsCollection(ms: MapMarker[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: ms.map((m) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.lon, m.lat] },
        properties: { label: m.label ?? '', color: m.color ?? '' },
      })),
    };
  }

  onMount(async () => {
    if (typeof window === 'undefined' || !containerEl || !hasData) return;
    // Dynamic imports avoid SSR issues and let Vite split out the heavy bundle.
    const [{ default: maplibregl }, turf] = await Promise.all([
      import('maplibre-gl'),
      import('@turf/turf'),
    ]);
    // Inject CSS once at module load time (string import lands in <head> via bundler)
    await import('maplibre-gl/dist/maplibre-gl.css');

    if (destroyed || !containerEl) return;

    // Build a unified FeatureCollection for bbox/centroid math
    const features: GeoJSON.Feature[] = [];
    if (safeMarkers.length) {
      features.push(...buildPointsCollection(safeMarkers).features);
    }
    if (geojson) {
      if ((geojson as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
        features.push(...((geojson as GeoJSON.FeatureCollection).features ?? []));
      } else {
        features.push(geojson as GeoJSON.Feature);
      }
    }
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

    // Resolve initial center/zoom
    let initialCenter: [number, number] = [0, 20];
    let initialZoom = 1;
    let bbox: [number, number, number, number] | null = null;

    if (center && Array.isArray(center) && isFiniteNum(center[0]) && isFiniteNum(center[1])) {
      initialCenter = [center[0], center[1]];
    } else if (features.length > 0) {
      try {
        bbox = (turf as any).bbox(fc) as [number, number, number, number];
        const [minX, minY, maxX, maxY] = bbox;
        if ([minX, minY, maxX, maxY].every(isFiniteNum)) {
          initialCenter = [(minX + maxX) / 2, (minY + maxY) / 2];
        }
      } catch {
        // ignore — fall back to default center
      }
    }
    if (isFiniteNum(zoom)) {
      initialZoom = zoom as number;
    }

    map = new maplibregl.Map({
      container: containerEl,
      style: STYLE_URL,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

    // Auto-fit if no explicit center/zoom and we have a bbox
    if (!center && !isFiniteNum(zoom) && bbox) {
      try {
        map.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          { padding: 40, animate: false, maxZoom: 14 },
        );
      } catch {
        // ignore
      }
    }

    map.on('load', () => {
      if (destroyed) return;

      // Markers — native MapLibre markers (one per point)
      for (const m of safeMarkers) {
        const marker = new maplibregl.Marker({ color: m.color ?? '#3b82f6' })
          .setLngLat([m.lon, m.lat]);
        if (m.label) {
          marker.setPopup(new maplibregl.Popup({ offset: 16 }).setText(m.label));
        }
        marker.addTo(map);
        mountedMarkers.push(marker);
      }

      // GeoJSON layer (lines, polygons, extra points)
      if (geojson) {
        try {
          map.addSource('auto-map-geojson', { type: 'geojson', data: geojson as any });
          map.addLayer({
            id: 'auto-map-fill',
            type: 'fill',
            source: 'auto-map-geojson',
            filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
            paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.25 },
          });
          map.addLayer({
            id: 'auto-map-line',
            type: 'line',
            source: 'auto-map-geojson',
            filter: ['any',
              ['==', ['geometry-type'], 'LineString'],
              ['==', ['geometry-type'], 'MultiLineString'],
              ['==', ['geometry-type'], 'Polygon'],
              ['==', ['geometry-type'], 'MultiPolygon'],
            ],
            paint: { 'line-color': '#1d4ed8', 'line-width': 2 },
          });
          map.addLayer({
            id: 'auto-map-circle',
            type: 'circle',
            source: 'auto-map-geojson',
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
              'circle-radius': 5,
              'circle-color': '#3b82f6',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            },
          });
        } catch {
          // ignore — invalid geojson should not crash the widget
        }
      }
    });
  });

  onDestroy(() => {
    destroyed = true;
    for (const mk of mountedMarkers) {
      try { mk.remove(); } catch { /* noop */ }
    }
    mountedMarkers = [];
    if (map) {
      try { map.remove(); } catch { /* noop */ }
      map = null;
    }
  });
</script>

<div class="bg-surface border border-border rounded-lg overflow-hidden font-sans">
  {#if !hasData}
    <div class="p-4 text-text2 text-sm">(no data)</div>
  {:else}
    <div bind:this={containerEl} style="width: 100%; height: {height};"></div>
  {/if}
</div>

<style>
  /* Ensure MapLibre canvas fills its container even when light theme overrides body */
  div :global(.maplibregl-map) {
    font-family: inherit;
  }
</style>
