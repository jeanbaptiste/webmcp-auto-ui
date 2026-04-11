// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-canvas2d — Server factory
// Creates a WebMCP server with all Canvas 2D widgets registered.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import heatmapRecipe from './recipes/heatmap.md?raw';
import sparklinesRecipe from './recipes/sparklines.md?raw';
import scatterRecipe from './recipes/scatter.md?raw';
import densityRecipe from './recipes/density.md?raw';
import flameGraphRecipe from './recipes/flame-graph.md?raw';

import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderSparklines } from './widgets/sparklines.js';
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderDensity } from './widgets/density.js';
import { render as renderFlameGraph } from './widgets/flame-graph.js';

/**
 * Create a WebMCP server pre-loaded with all Canvas 2D widgets.
 * Zero external dependencies — pure Canvas 2D rendering.
 */
export function createCanvas2dServer() {
  const server = createWebMcpServer('canvas2d', {
    description: 'High-performance Canvas 2D widgets for large datasets',
  });

  server.registerWidget(heatmapRecipe, renderHeatmap);
  server.registerWidget(sparklinesRecipe, renderSparklines);
  server.registerWidget(scatterRecipe, renderScatter);
  server.registerWidget(densityRecipe, renderDensity);
  server.registerWidget(flameGraphRecipe, renderFlameGraph);

  return server;
}
