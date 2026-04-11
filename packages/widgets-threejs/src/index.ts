// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-threejs — Public API
// ---------------------------------------------------------------------------

export { threejsServer } from './server.js';

// Individual renderers (for custom server composition)
export { render as renderGlobe } from './widgets/globe.js';
export { render as renderTerrain } from './widgets/terrain.js';
export { render as renderScatter3d } from './widgets/scatter3d.js';
export { render as renderMeshViewer } from './widgets/mesh-viewer.js';
export { render as renderBar3d } from './widgets/bar3d.js';
