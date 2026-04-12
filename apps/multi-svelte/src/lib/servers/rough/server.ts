// @ts-nocheck
// ---------------------------------------------------------------------------
// Rough.js visualization server — 32 hand-drawn sketch widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import barChartRecipe from './recipes/bar-chart.md?raw';
import groupedBarRecipe from './recipes/grouped-bar.md?raw';
import stackedBarRecipe from './recipes/stacked-bar.md?raw';
import lineChartRecipe from './recipes/line-chart.md?raw';
import areaChartRecipe from './recipes/area-chart.md?raw';
import multiLineRecipe from './recipes/multi-line.md?raw';
import scatterPlotRecipe from './recipes/scatter-plot.md?raw';
import bubbleChartRecipe from './recipes/bubble-chart.md?raw';
import pieChartRecipe from './recipes/pie-chart.md?raw';
import donutChartRecipe from './recipes/donut-chart.md?raw';
import radarChartRecipe from './recipes/radar-chart.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import waterfallRecipe from './recipes/waterfall.md?raw';
import ganttRecipe from './recipes/gantt.md?raw';
import histogramRecipe from './recipes/histogram.md?raw';
import boxPlotRecipe from './recipes/box-plot.md?raw';
import errorBarRecipe from './recipes/error-bar.md?raw';
import stepChartRecipe from './recipes/step-chart.md?raw';
import sparklineRecipe from './recipes/sparkline.md?raw';
import networkGraphRecipe from './recipes/network-graph.md?raw';
import treeDiagramRecipe from './recipes/tree-diagram.md?raw';
import timelineRecipe from './recipes/timeline.md?raw';
import progressBarRecipe from './recipes/progress-bar.md?raw';
import gaugeRecipe from './recipes/gauge.md?raw';
import candlestickRecipe from './recipes/candlestick.md?raw';
import dotPlotRecipe from './recipes/dot-plot.md?raw';
import slopeChartRecipe from './recipes/slope-chart.md?raw';
import sankeyRecipe from './recipes/sankey.md?raw';
import vennDiagramRecipe from './recipes/venn-diagram.md?raw';
import chordDiagramRecipe from './recipes/chord-diagram.md?raw';
import marimekkoRecipe from './recipes/marimekko.md?raw';

// Renderers
import { render as renderBarChart } from './widgets/bar-chart.js';
import { render as renderGroupedBar } from './widgets/grouped-bar.js';
import { render as renderStackedBar } from './widgets/stacked-bar.js';
import { render as renderLineChart } from './widgets/line-chart.js';
import { render as renderAreaChart } from './widgets/area-chart.js';
import { render as renderMultiLine } from './widgets/multi-line.js';
import { render as renderScatterPlot } from './widgets/scatter-plot.js';
import { render as renderBubbleChart } from './widgets/bubble-chart.js';
import { render as renderPieChart } from './widgets/pie-chart.js';
import { render as renderDonutChart } from './widgets/donut-chart.js';
import { render as renderRadarChart } from './widgets/radar-chart.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderWaterfall } from './widgets/waterfall.js';
import { render as renderGantt } from './widgets/gantt.js';
import { render as renderHistogram } from './widgets/histogram.js';
import { render as renderBoxPlot } from './widgets/box-plot.js';
import { render as renderErrorBar } from './widgets/error-bar.js';
import { render as renderStepChart } from './widgets/step-chart.js';
import { render as renderSparkline } from './widgets/sparkline.js';
import { render as renderNetworkGraph } from './widgets/network-graph.js';
import { render as renderTreeDiagram } from './widgets/tree-diagram.js';
import { render as renderTimeline } from './widgets/timeline.js';
import { render as renderProgressBar } from './widgets/progress-bar.js';
import { render as renderGauge } from './widgets/gauge.js';
import { render as renderCandlestick } from './widgets/candlestick.js';
import { render as renderDotPlot } from './widgets/dot-plot.js';
import { render as renderSlopeChart } from './widgets/slope-chart.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderVennDiagram } from './widgets/venn-diagram.js';
import { render as renderChordDiagram } from './widgets/chord-diagram.js';
import { render as renderMarimekko } from './widgets/marimekko.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const roughServer = createWebMcpServer('rough', {
  description:
    'Hand-drawn sketch-style charts and diagrams powered by Rough.js (bar, line, pie, radar, sankey, gantt, network, and more)',
});

const widgets: Array<[string, unknown]> = [
  [barChartRecipe, renderBarChart],
  [groupedBarRecipe, renderGroupedBar],
  [stackedBarRecipe, renderStackedBar],
  [lineChartRecipe, renderLineChart],
  [areaChartRecipe, renderAreaChart],
  [multiLineRecipe, renderMultiLine],
  [scatterPlotRecipe, renderScatterPlot],
  [bubbleChartRecipe, renderBubbleChart],
  [pieChartRecipe, renderPieChart],
  [donutChartRecipe, renderDonutChart],
  [radarChartRecipe, renderRadarChart],
  [heatmapRecipe, renderHeatmap],
  [treemapRecipe, renderTreemap],
  [waterfallRecipe, renderWaterfall],
  [ganttRecipe, renderGantt],
  [histogramRecipe, renderHistogram],
  [boxPlotRecipe, renderBoxPlot],
  [errorBarRecipe, renderErrorBar],
  [stepChartRecipe, renderStepChart],
  [sparklineRecipe, renderSparkline],
  [networkGraphRecipe, renderNetworkGraph],
  [treeDiagramRecipe, renderTreeDiagram],
  [timelineRecipe, renderTimeline],
  [progressBarRecipe, renderProgressBar],
  [gaugeRecipe, renderGauge],
  [candlestickRecipe, renderCandlestick],
  [dotPlotRecipe, renderDotPlot],
  [slopeChartRecipe, renderSlopeChart],
  [sankeyRecipe, renderSankey],
  [vennDiagramRecipe, renderVennDiagram],
  [chordDiagramRecipe, renderChordDiagram],
  [marimekkoRecipe, renderMarimekko],
];

for (const [recipe, renderer] of widgets) {
  roughServer.registerWidget(recipe as string, renderer);
}

export { roughServer };
