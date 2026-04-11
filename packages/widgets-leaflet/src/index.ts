// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-leaflet — Public API
// ---------------------------------------------------------------------------

export { leafletServer } from './server.js';

// Individual renderers (for custom server composition)
export { render as renderLeafletMap } from './widgets/leaflet-map.js';
export { render as renderChoropleth } from './widgets/choropleth.js';
export { render as renderHeatmapGeo } from './widgets/heatmap-geo.js';
export { render as renderMarkerCluster } from './widgets/marker-cluster.js';
