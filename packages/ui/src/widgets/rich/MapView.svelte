<script lang="ts">
  export interface LatLng { lat: number; lng: number; }
  export interface MapMarker { lat: number; lng: number; label?: string; color?: string; }
  export interface MapSpec { title?: string; center?: LatLng; zoom?: number; height?: string; markers?: MapMarker[]; }
  interface Props { spec: Partial<MapSpec>; data?: unknown; onmarkerclick?: (m: MapMarker) => void; }
  let { spec }: Props = $props();
</script>
<div class="bg-[#13131a] border border-white/[0.07] rounded-lg p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-zinc-300 mb-3">{spec.title}</h3>{/if}
  <div class="rounded bg-[#0a0a14] flex flex-col items-center justify-center text-zinc-600 text-sm border border-white/[0.05] gap-2" style="height:{spec.height??'400px'};">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-1.447-.894L15 12m0 8V12M9 7l6-2.5"/>
    </svg>
    <span class="font-mono text-xs">Map widget — Leaflet/Maplibre requis</span>
    {#if spec.center}<span class="text-xs text-zinc-700 font-mono">Center: {spec.center.lat}, {spec.center.lng} · Zoom: {spec.zoom??10}</span>{/if}
    {#if spec.markers?.length}<span class="text-xs text-zinc-700 font-mono">{spec.markers.length} marqueur{spec.markers.length>1?'s':''}</span>{/if}
  </div>
</div>
