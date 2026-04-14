// @ts-nocheck
// ---------------------------------------------------------------------------
// Chart.js visualization server — 8 widgets (all native Chart.js types)
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import lineRecipe from './recipes/line.md?raw';
import barRecipe from './recipes/bar.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import doughnutRecipe from './recipes/doughnut.md?raw';
import polarAreaRecipe from './recipes/polar-area.md?raw';
import radarRecipe from './recipes/radar.md?raw';
import scatterRecipe from './recipes/scatter.md?raw';
import bubbleRecipe from './recipes/bubble.md?raw';

// Renderers
import { render as renderLine } from './widgets/line.js';
import { render as renderBar } from './widgets/bar.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderDoughnut } from './widgets/doughnut.js';
import { render as renderPolarArea } from './widgets/polar-area.js';
import { render as renderRadar } from './widgets/radar.js';
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderBubble } from './widgets/bubble.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const chartjsServer = createWebMcpServer('chartjs', {
  description: 'Chart.js visualizations (line, bar, pie, doughnut, radar, polar area, scatter, bubble)',
});

const widgets: Array<[string, unknown]> = [
  [lineRecipe, renderLine],
  [barRecipe, renderBar],
  [pieRecipe, renderPie],
  [doughnutRecipe, renderDoughnut],
  [polarAreaRecipe, renderPolarArea],
  [radarRecipe, renderRadar],
  [scatterRecipe, renderScatter],
  [bubbleRecipe, renderBubble],
];

for (const [recipe, renderer] of widgets) {
  chartjsServer.registerWidget(recipe as string, renderer);
}

export { chartjsServer };
