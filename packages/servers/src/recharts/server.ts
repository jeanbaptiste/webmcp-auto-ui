// @ts-nocheck
// ---------------------------------------------------------------------------
// Recharts visualization server — React charts (12 widgets)
// LineChart, BarChart, AreaChart, ComposedChart, PieChart, RadialBarChart,
// ScatterChart, RadarChart, Treemap, Sankey, FunnelChart, Brush composite
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import lineRecipe from './recipes/line.md?raw';
import barRecipe from './recipes/bar.md?raw';
import areaRecipe from './recipes/area.md?raw';
import composedRecipe from './recipes/composed.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import radialBarRecipe from './recipes/radial-bar.md?raw';
import scatterRecipe from './recipes/scatter.md?raw';
import radarRecipe from './recipes/radar.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import sankeyRecipe from './recipes/sankey.md?raw';
import funnelRecipe from './recipes/funnel.md?raw';
import brushRecipe from './recipes/brush.md?raw';

// Renderers
import { render as renderLine } from './widgets/line.js';
import { render as renderBar } from './widgets/bar.js';
import { render as renderArea } from './widgets/area.js';
import { render as renderComposed } from './widgets/composed.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderRadialBar } from './widgets/radial-bar.js';
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderRadar } from './widgets/radar.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderFunnel } from './widgets/funnel.js';
import { render as renderBrush } from './widgets/brush.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const rechartsServer = createWebMcpServer('recharts', {
  description:
    'React charts with Recharts — line, bar, area, composed, pie, radial bar, scatter, radar, treemap, sankey, funnel, brushable timeseries (12 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [lineRecipe, renderLine],
  [barRecipe, renderBar],
  [areaRecipe, renderArea],
  [composedRecipe, renderComposed],
  [pieRecipe, renderPie],
  [radialBarRecipe, renderRadialBar],
  [scatterRecipe, renderScatter],
  [radarRecipe, renderRadar],
  [treemapRecipe, renderTreemap],
  [sankeyRecipe, renderSankey],
  [funnelRecipe, renderFunnel],
  [brushRecipe, renderBrush],
];

for (const [recipe, renderer] of widgets) {
  rechartsServer.registerWidget(recipe as string, renderer);
}

export { rechartsServer };
