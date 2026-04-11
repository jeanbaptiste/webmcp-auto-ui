// @ts-nocheck
// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-plotly — WebMCP Server
// Scientific charts powered by Plotly.js
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import scatterRecipe from './recipes/plotly-scatter.md?raw';
import surfaceRecipe from './recipes/plotly-surface.md?raw';
import histogramRecipe from './recipes/plotly-histogram.md?raw';
import boxRecipe from './recipes/plotly-box.md?raw';
import violinRecipe from './recipes/plotly-violin.md?raw';
import parallelRecipe from './recipes/plotly-parallel.md?raw';

import { render as renderScatter } from './widgets/plotly-scatter.js';
import { render as renderSurface } from './widgets/plotly-surface.js';
import { render as renderHistogram } from './widgets/plotly-histogram.js';
import { render as renderBox } from './widgets/plotly-box.js';
import { render as renderViolin } from './widgets/plotly-violin.js';
import { render as renderParallel } from './widgets/plotly-parallel.js';

export const plotlyServer = createWebMcpServer('plotly', {
  description:
    'Scientific charts with Plotly.js (scatter, surface, histogram, box, violin, parallel coordinates)',
});

plotlyServer.registerWidget(scatterRecipe, renderScatter);
plotlyServer.registerWidget(surfaceRecipe, renderSurface);
plotlyServer.registerWidget(histogramRecipe, renderHistogram);
plotlyServer.registerWidget(boxRecipe, renderBox);
plotlyServer.registerWidget(violinRecipe, renderViolin);
plotlyServer.registerWidget(parallelRecipe, renderParallel);
