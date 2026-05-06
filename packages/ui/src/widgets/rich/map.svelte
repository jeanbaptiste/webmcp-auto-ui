<svelte:options customElement={{ tag: 'auto-map', shadow: 'none' }} />

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export interface MapMarker {
    lat: number;
    lon: number;
    label?: string;
    color?: string;
  }

  export interface TileLayer {
    name?: string;
    url: string;
    opacity?: number;
  }

  interface Props {
    markers?: MapMarker[];
    geojson?: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
    center?: [number, number] | { lat: number; lon?: number; lng?: number };
    zoom?: number;
    height?: string;
    cluster?: boolean;
    tileLayers?: TileLayer[];
    // Tolerated unknown props (logged + ignored)
    title?: unknown;
    popup?: unknown;
    radius?: unknown;
    color_field?: unknown;
    color_scale?: unknown;
  }

  let {
    markers: rawMarkers = [],
    geojson: rawGeojson = null,
    center: rawCenter,
    zoom: rawZoom,
    height: rawHeight = '400px',
    cluster: rawCluster = false,
    tileLayers: rawTileLayers = [],
    title: _title,
    popup: _popup,
    radius: _radius,
    color_field: _color_field,
    color_scale: _color_scale,
  }: Props = $props();

  const IGNORED_AT_INIT: Array<[string, unknown]> = [
    ['title', _title],
    ['popup', _popup],
    ['radius', _radius],
    ['color_field', _color_field],
    ['color_scale', _color_scale],
  ];
  for (const [key, val] of IGNORED_AT_INIT) {
    if (val !== undefined) {
      // eslint-disable-next-line no-console
      console.warn('[auto-map] unknown prop ignored:', key);
    }
  }

  function normalizeMarker(raw: unknown): MapMarker | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const lat = o.lat;
    const lon = o.lon ?? o.lng;
    if (typeof lat !== 'number' || !Number.isFinite(lat)) return null;
    if (typeof lon !== 'number' || !Number.isFinite(lon)) return null;
    const label = (typeof o.label === 'string' ? o.label : undefined) ??
                  (typeof o.popup === 'string' ? o.popup : undefined);
    const color = typeof o.color === 'string' ? o.color : undefined;
    return { lat, lon, label, color };
  }

  function normalizeCenter(raw: unknown): [number, number] | undefined {
    if (raw == null) return undefined;
    if (Array.isArray(raw) && raw.length >= 2 &&
        typeof raw[0] === 'number' && Number.isFinite(raw[0]) &&
        typeof raw[1] === 'number' && Number.isFinite(raw[1])) {
      return [raw[0], raw[1]];
    }
    if (typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      const lat = o.lat;
      const lon = o.lon ?? o.lng;
      if (typeof lat === 'number' && typeof lon === 'number' &&
          Number.isFinite(lat) && Number.isFinite(lon)) {
        return [lon, lat];
      }
    }
    return undefined;
  }

  const markers: MapMarker[] = Array.isArray(rawMarkers)
    ? (rawMarkers as unknown[]).map(normalizeMarker).filter((m): m is MapMarker => m !== null)
    : [];
  const geojson = rawGeojson ?? null;
  const center = normalizeCenter(rawCenter);
  const zoom = rawZoom;
  const height = rawHeight;
  const cluster = rawCluster === true;
  const tileLayers: TileLayer[] = Array.isArray(rawTileLayers)
    ? (rawTileLayers as unknown[]).flatMap((t) => {
        if (!t || typeof t !== 'object') return [];
        const o = t as Record<string, unknown>;
        if (typeof o.url !== 'string') return [];
        return [{
          url: o.url,
          name: typeof o.name === 'string' ? o.name : undefined,
          opacity: typeof o.opacity === 'number' ? o.opacity : undefined,
        }];
      })
    : [];

  /** Light, free MapLibre style (Carto Positron, no API key). */
  const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  let containerEl: HTMLDivElement | undefined = $state();
  let map: any = null;
  let mountedMarkers: any[] = [];
  let destroyed = false;

  function isFiniteNum(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v);
  }

  const safeMarkers = markers;
  const hasData = safeMarkers.length > 0 || !!geojson || tileLayers.length > 0;

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

      // Raster tile overlays (e.g. NASA GIBS)
      for (let i = 0; i < tileLayers.length; i++) {
        const tl = tileLayers[i];
        const sourceId = `auto-map-tile-src-${i}`;
        const layerId = `auto-map-tile-layer-${i}`;
        try {
          map.addSource(sourceId, {
            type: 'raster',
            tiles: [tl.url],
            tileSize: 256,
          });
          map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: { 'raster-opacity': typeof tl.opacity === 'number' ? tl.opacity : 1 },
          });
        } catch {
          // ignore — invalid tile url should not crash the widget
        }
      }

      if (cluster && safeMarkers.length > 0) {
        // Clustered markers via maplibre native cluster API
        try {
          map.addSource('auto-map-cluster-src', {
            type: 'geojson',
            data: buildPointsCollection(safeMarkers) as any,
            cluster: true,
            clusterRadius: 50,
            clusterMaxZoom: 14,
          });
          map.addLayer({
            id: 'auto-map-clusters',
            type: 'circle',
            source: 'auto-map-cluster-src',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step', ['get', 'point_count'],
                '#93c5fd', 10, '#60a5fa', 50, '#3b82f6',
              ],
              'circle-radius': [
                'step', ['get', 'point_count'],
                15, 10, 20, 50, 25,
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            },
          });
          map.addLayer({
            id: 'auto-map-cluster-count',
            type: 'symbol',
            source: 'auto-map-cluster-src',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 12,
            },
            paint: { 'text-color': '#ffffff' },
          });
          map.addLayer({
            id: 'auto-map-cluster-points',
            type: 'circle',
            source: 'auto-map-cluster-src',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#3b82f6',
              'circle-radius': 6,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            },
          });
          // Click on cluster → zoom in
          map.on('click', 'auto-map-clusters', (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['auto-map-clusters'] });
            const clusterId = features[0]?.properties?.cluster_id;
            const src = map.getSource('auto-map-cluster-src') as any;
            if (clusterId != null && src?.getClusterExpansionZoom) {
              src.getClusterExpansionZoom(clusterId, (err: any, zoomLevel: number) => {
                if (err) return;
                map.easeTo({ center: features[0].geometry.coordinates, zoom: zoomLevel });
              });
            }
          });
          // Click on individual point → popup
          map.on('click', 'auto-map-cluster-points', (e: any) => {
            const f = e.features?.[0];
            if (!f) return;
            const label = f.properties?.label;
            if (label) {
              new maplibregl.Popup({ offset: 12 })
                .setLngLat(f.geometry.coordinates)
                .setText(label)
                .addTo(map);
            }
          });
        } catch {
          // ignore
        }
      } else {
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
