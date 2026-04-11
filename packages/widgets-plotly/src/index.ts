// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-plotly — Public API
// ---------------------------------------------------------------------------

export { plotlyServer } from './server.js';

// Individual renderers (for custom server composition)
export { render as renderScatter } from './widgets/plotly-scatter.js';
export { render as renderSurface } from './widgets/plotly-surface.js';
export { render as renderHistogram } from './widgets/plotly-histogram.js';
export { render as renderBox } from './widgets/plotly-box.js';
export { render as renderViolin } from './widgets/plotly-violin.js';
export { render as renderParallel } from './widgets/plotly-parallel.js';
