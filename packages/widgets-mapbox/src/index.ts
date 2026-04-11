// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-mapbox — Public API
// ---------------------------------------------------------------------------

export { mapboxServer } from './server.js';

// Individual renderers (for custom server composition)
export { render as renderMapboxMap } from './widgets/mapbox-map.js';
export { render as renderMapboxChoropleth } from './widgets/mapbox-choropleth.js';
export { render as renderMapbox3d } from './widgets/mapbox-3d.js';
export { render as renderMapboxRoute } from './widgets/mapbox-route.js';
