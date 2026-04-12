// @ts-nocheck
// ---------------------------------------------------------------------------
// Canvas 2D visualization server — 25 widgets, zero external dependencies
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import scatterRecipe from './recipes/scatter.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import barChartRecipe from './recipes/bar-chart.md?raw';
import stackedBarRecipe from './recipes/stacked-bar.md?raw';
import lineChartRecipe from './recipes/line-chart.md?raw';
import areaChartRecipe from './recipes/area-chart.md?raw';
import sparklineRecipe from './recipes/sparkline.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import donutRecipe from './recipes/donut.md?raw';
import flameGraphRecipe from './recipes/flame-graph.md?raw';
import densityRecipe from './recipes/density.md?raw';
import histogramRecipe from './recipes/histogram.md?raw';
import gaugeRecipe from './recipes/gauge.md?raw';
import radialBarRecipe from './recipes/radial-bar.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import timelineRecipe from './recipes/timeline.md?raw';
import bubbleRecipe from './recipes/bubble.md?raw';
import boxPlotRecipe from './recipes/box-plot.md?raw';
import candlestickRecipe from './recipes/candlestick.md?raw';
import networkGraphRecipe from './recipes/network-graph.md?raw';
import hbarProgressRecipe from './recipes/hbar-progress.md?raw';
import dotMatrixRecipe from './recipes/dot-matrix.md?raw';
import correlationRecipe from './recipes/correlation.md?raw';
import stepChartRecipe from './recipes/step-chart.md?raw';
import waterfallRecipe from './recipes/waterfall.md?raw';

// Renderers
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderBarChart } from './widgets/bar-chart.js';
import { render as renderStackedBar } from './widgets/stacked-bar.js';
import { render as renderLineChart } from './widgets/line-chart.js';
import { render as renderAreaChart } from './widgets/area-chart.js';
import { render as renderSparkline } from './widgets/sparkline.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderDonut } from './widgets/donut.js';
import { render as renderFlameGraph } from './widgets/flame-graph.js';
import { render as renderDensity } from './widgets/density.js';
import { render as renderHistogram } from './widgets/histogram.js';
import { render as renderGauge } from './widgets/gauge.js';
import { render as renderRadialBar } from './widgets/radial-bar.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderTimeline } from './widgets/timeline.js';
import { render as renderBubble } from './widgets/bubble.js';
import { render as renderBoxPlot } from './widgets/box-plot.js';
import { render as renderCandlestick } from './widgets/candlestick.js';
import { render as renderNetworkGraph } from './widgets/network-graph.js';
import { render as renderHbarProgress } from './widgets/hbar-progress.js';
import { render as renderDotMatrix } from './widgets/dot-matrix.js';
import { render as renderCorrelation } from './widgets/correlation.js';
import { render as renderStepChart } from './widgets/step-chart.js';
import { render as renderWaterfall } from './widgets/waterfall.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const canvas2dServer = createWebMcpServer('canvas2d', {
  description:
    'High-performance Canvas 2D widgets — scatter, heatmap, bar, line, area, pie, donut, flame-graph, density, histogram, gauge, radial-bar, treemap, timeline, bubble, box-plot, candlestick, network-graph, hbar-progress, dot-matrix, correlation, step-chart, waterfall, sparkline, stacked-bar',
});

const widgets: Array<[string, unknown]> = [
  [scatterRecipe, renderScatter],
  [heatmapRecipe, renderHeatmap],
  [barChartRecipe, renderBarChart],
  [stackedBarRecipe, renderStackedBar],
  [lineChartRecipe, renderLineChart],
  [areaChartRecipe, renderAreaChart],
  [sparklineRecipe, renderSparkline],
  [pieRecipe, renderPie],
  [donutRecipe, renderDonut],
  [flameGraphRecipe, renderFlameGraph],
  [densityRecipe, renderDensity],
  [histogramRecipe, renderHistogram],
  [gaugeRecipe, renderGauge],
  [radialBarRecipe, renderRadialBar],
  [treemapRecipe, renderTreemap],
  [timelineRecipe, renderTimeline],
  [bubbleRecipe, renderBubble],
  [boxPlotRecipe, renderBoxPlot],
  [candlestickRecipe, renderCandlestick],
  [networkGraphRecipe, renderNetworkGraph],
  [hbarProgressRecipe, renderHbarProgress],
  [dotMatrixRecipe, renderDotMatrix],
  [correlationRecipe, renderCorrelation],
  [stepChartRecipe, renderStepChart],
  [waterfallRecipe, renderWaterfall],
];

for (const [recipe, renderer] of widgets) {
  canvas2dServer.registerWidget(recipe as string, renderer);
}

export { canvas2dServer };
