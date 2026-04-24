// @ts-nocheck
// ---------------------------------------------------------------------------
// Apache ECharts visualization server — 22 widgets
// Bars, lines, pie, scatter, candlestick, radar, boxplot, heatmap, tree,
// treemap, sunburst, sankey, funnel, gauge, pictorial, themeRiver, calendar,
// parallel, graph (network), polar, animated lines.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import barRecipe from './recipes/bar.md?raw';
import lineRecipe from './recipes/line.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import scatterRecipe from './recipes/scatter.md?raw';
import effectScatterRecipe from './recipes/effect-scatter.md?raw';
import candlestickRecipe from './recipes/candlestick.md?raw';
import radarRecipe from './recipes/radar.md?raw';
import boxplotRecipe from './recipes/boxplot.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import treeRecipe from './recipes/tree.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import sunburstRecipe from './recipes/sunburst.md?raw';
import sankeyRecipe from './recipes/sankey.md?raw';
import funnelRecipe from './recipes/funnel.md?raw';
import gaugeRecipe from './recipes/gauge.md?raw';
import pictorialBarRecipe from './recipes/pictorial-bar.md?raw';
import themeRiverRecipe from './recipes/theme-river.md?raw';
import calendarRecipe from './recipes/calendar.md?raw';
import parallelRecipe from './recipes/parallel.md?raw';
import graphRecipe from './recipes/graph.md?raw';
import linesRecipe from './recipes/lines.md?raw';
import polarBarRecipe from './recipes/polar-bar.md?raw';

// Renderers
import { render as renderBar } from './widgets/bar.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderEffectScatter } from './widgets/effect-scatter.js';
import { render as renderCandlestick } from './widgets/candlestick.js';
import { render as renderRadar } from './widgets/radar.js';
import { render as renderBoxplot } from './widgets/boxplot.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderTree } from './widgets/tree.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderFunnel } from './widgets/funnel.js';
import { render as renderGauge } from './widgets/gauge.js';
import { render as renderPictorialBar } from './widgets/pictorial-bar.js';
import { render as renderThemeRiver } from './widgets/theme-river.js';
import { render as renderCalendar } from './widgets/calendar.js';
import { render as renderParallel } from './widgets/parallel.js';
import { render as renderGraph } from './widgets/graph.js';
import { render as renderLines } from './widgets/lines.js';
import { render as renderPolarBar } from './widgets/polar-bar.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const echartsServer = createWebMcpServer('echarts', {
  description:
    'Apache ECharts visualizations — bars, lines, pie, scatter, candlestick, radar, boxplot, heatmap, tree, treemap, sunburst, sankey, funnel, gauge, themeRiver, calendar, parallel, graph, polar (22 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [barRecipe, renderBar],
  [lineRecipe, renderLine],
  [pieRecipe, renderPie],
  [scatterRecipe, renderScatter],
  [effectScatterRecipe, renderEffectScatter],
  [candlestickRecipe, renderCandlestick],
  [radarRecipe, renderRadar],
  [boxplotRecipe, renderBoxplot],
  [heatmapRecipe, renderHeatmap],
  [treeRecipe, renderTree],
  [treemapRecipe, renderTreemap],
  [sunburstRecipe, renderSunburst],
  [sankeyRecipe, renderSankey],
  [funnelRecipe, renderFunnel],
  [gaugeRecipe, renderGauge],
  [pictorialBarRecipe, renderPictorialBar],
  [themeRiverRecipe, renderThemeRiver],
  [calendarRecipe, renderCalendar],
  [parallelRecipe, renderParallel],
  [graphRecipe, renderGraph],
  [linesRecipe, renderLines],
  [polarBarRecipe, renderPolarBar],
];

for (const [recipe, renderer] of widgets) {
  echartsServer.registerWidget(recipe as string, renderer);
}

export { echartsServer };
