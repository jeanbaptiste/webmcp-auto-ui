// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-canvas2d — Public API
// ---------------------------------------------------------------------------

// Server factory (registers all widgets)
export { createCanvas2dServer } from './server.js';

// Individual renderers (for custom registration)
export { render as renderHeatmap } from './widgets/heatmap.js';
export { render as renderSparklines } from './widgets/sparklines.js';
export { render as renderScatter } from './widgets/scatter.js';
export { render as renderDensity } from './widgets/density.js';
export { render as renderFlameGraph } from './widgets/flame-graph.js';

// Utilities (for building custom Canvas 2D widgets)
export {
  fitCanvas,
  autoResize,
  coldHot,
  categoryColor,
  drawAxis,
  drawGrid,
  showTooltip,
  hideTooltip,
} from './utils.js';
