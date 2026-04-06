<script lang="ts">
  import { onMount } from 'svelte';

  export interface LatLng    { lat: number; lng: number; }
  export interface MapMarker { lat: number; lng: number; label?: string; color?: string; }
  export interface MapSpec   {
    title?:   string;
    center?:  LatLng;
    zoom?:    number;
    height?:  string;
    markers?: MapMarker[];
  }
  interface Props {
    spec:           Partial<MapSpec>;
    data?:          unknown;
    onmarkerclick?: (m: MapMarker) => void;
  }

  let { spec, onmarkerclick }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let leafletLoaded = $state(false);
  let map: import('leaflet').Map | undefined;
  let activeMarkers: import('leaflet').CircleMarker[] = [];
  let L: typeof import('leaflet') | undefined;

  function markerColor(color?: string): string {
    return color ?? '#7c6dfa';
  }

  function syncMarkers(markers: MapMarker[]): void {
    if (!L || !map) return;
    activeMarkers.forEach(mk => mk.remove());
    activeMarkers = [];
    for (const marker of markers) {
      const cm = L.circleMarker([marker.lat, marker.lng], {
        radius:      7,
        color:       markerColor(marker.color),
        fillColor:   markerColor(marker.color),
        fillOpacity: 0.85,
        weight:      1.5,
      }).addTo(map);
      if (marker.label) {
        cm.bindTooltip(marker.label, {
          direction: 'top',
          offset: L.point(0, -8),
          className: 'mapview-tooltip',
        });
      }
      cm.on('click', () => onmarkerclick?.(marker));
      activeMarkers.push(cm);
    }
  }

  onMount(async () => {
    const leaflet = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    L = (leaflet.default ?? leaflet) as typeof import('leaflet');
    if (!container || !L) return;

    const center: [number, number] = spec.center
      ? [spec.center.lat, spec.center.lng]
      : [46.6, 2.3];

    map = L.map(container, {
      center,
      zoom: spec.zoom ?? 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    syncMarkers(spec.markers ?? []);
    leafletLoaded = true;

    return () => {
      map?.remove();
      map = undefined;
    };
  });

  $effect(() => {
    if (!leafletLoaded) return;
    syncMarkers(spec.markers ?? []);
  });

  $effect(() => {
    if (!map || !spec.center) return;
    map.setView([spec.center.lat, spec.center.lng], spec.zoom ?? 6);
  });
</script>

<style>
  :global(.mapview-tooltip) {
    background: #1e1e2e;
    border: 1px solid rgba(255,255,255,0.08);
    color: #d4d4e0;
    font-size: 11px;
    font-family: ui-monospace, monospace;
    border-radius: 4px;
    padding: 2px 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  :global(.mapview-tooltip::before) {
    border-top-color: rgba(255,255,255,0.08);
  }
  :global(.leaflet-container) {
    background: #0a0a14;
  }
</style>

<div class="bg-[#13131a] border border-white/[0.07] rounded-lg p-4 font-sans">
  {#if spec.title}
    <h3 class="text-sm font-semibold text-zinc-300 mb-3">{spec.title}</h3>
  {/if}
  <div
    bind:this={container}
    class="rounded overflow-hidden border border-white/[0.05]"
    style="height:{spec.height ?? '400px'};"
  >
    {#if !leafletLoaded}
      <div class="w-full h-full bg-[#0a0a14] flex flex-col items-center justify-center text-zinc-600 text-sm gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-1.447-.894L15 12m0 8V12M9 7l6-2.5"/>
        </svg>
        <span class="font-mono text-xs">Chargement de la carte…</span>
      </div>
    {/if}
  </div>
  {#if spec.markers?.length}
    <div class="mt-2 text-xs text-zinc-700 font-mono">
      {spec.markers.length} marqueur{spec.markers.length > 1 ? 's' : ''}
    </div>
  {/if}
</div>
