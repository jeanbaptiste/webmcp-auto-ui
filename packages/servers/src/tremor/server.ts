// @ts-nocheck
// ---------------------------------------------------------------------------
// Tremor dashboard components server — React-based widgets
// Charts (area, bar, line, donut, scatter), KPIs (card, metric, delta),
// indicators (progress-bar, progress-circle, tracker, category-bar),
// sparklines (area/bar/line), lists (bar-list), tables, callouts, typography.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import areaChartRecipe from './recipes/area-chart.md?raw';
import barChartRecipe from './recipes/bar-chart.md?raw';
import lineChartRecipe from './recipes/line-chart.md?raw';
import donutChartRecipe from './recipes/donut-chart.md?raw';
import scatterChartRecipe from './recipes/scatter-chart.md?raw';
import kpiCardRecipe from './recipes/kpi-card.md?raw';
import metricRecipe from './recipes/metric.md?raw';
import progressBarRecipe from './recipes/progress-bar.md?raw';
import progressCircleRecipe from './recipes/progress-circle.md?raw';
import trackerRecipe from './recipes/tracker.md?raw';
import categoryBarRecipe from './recipes/category-bar.md?raw';
import barListRecipe from './recipes/bar-list.md?raw';
import sparkAreaRecipe from './recipes/spark-area.md?raw';
import sparkBarRecipe from './recipes/spark-bar.md?raw';
import sparkLineRecipe from './recipes/spark-line.md?raw';
import calloutRecipe from './recipes/callout.md?raw';
import dataTableRecipe from './recipes/data-table.md?raw';
import badgeDeltaRecipe from './recipes/badge-delta.md?raw';
import legendRecipe from './recipes/legend.md?raw';
import textBlockRecipe from './recipes/text-block.md?raw';

// Renderers
import { render as renderAreaChart } from './widgets/area-chart.js';
import { render as renderBarChart } from './widgets/bar-chart.js';
import { render as renderLineChart } from './widgets/line-chart.js';
import { render as renderDonutChart } from './widgets/donut-chart.js';
import { render as renderScatterChart } from './widgets/scatter-chart.js';
import { render as renderKpiCard } from './widgets/kpi-card.js';
import { render as renderMetric } from './widgets/metric.js';
import { render as renderProgressBar } from './widgets/progress-bar.js';
import { render as renderProgressCircle } from './widgets/progress-circle.js';
import { render as renderTracker } from './widgets/tracker.js';
import { render as renderCategoryBar } from './widgets/category-bar.js';
import { render as renderBarList } from './widgets/bar-list.js';
import { render as renderSparkArea } from './widgets/spark-area.js';
import { render as renderSparkBar } from './widgets/spark-bar.js';
import { render as renderSparkLine } from './widgets/spark-line.js';
import { render as renderCallout } from './widgets/callout.js';
import { render as renderDataTable } from './widgets/data-table.js';
import { render as renderBadgeDelta } from './widgets/badge-delta.js';
import { render as renderLegend } from './widgets/legend.js';
import { render as renderTextBlock } from './widgets/text-block.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const tremorServer = createWebMcpServer('tremor', {
  description:
    'Dashboard components with Tremor/React — charts, KPIs, indicators, sparklines, tables, callouts (20 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [areaChartRecipe, renderAreaChart],
  [barChartRecipe, renderBarChart],
  [lineChartRecipe, renderLineChart],
  [donutChartRecipe, renderDonutChart],
  [scatterChartRecipe, renderScatterChart],
  [kpiCardRecipe, renderKpiCard],
  [metricRecipe, renderMetric],
  [progressBarRecipe, renderProgressBar],
  [progressCircleRecipe, renderProgressCircle],
  [trackerRecipe, renderTracker],
  [categoryBarRecipe, renderCategoryBar],
  [barListRecipe, renderBarList],
  [sparkAreaRecipe, renderSparkArea],
  [sparkBarRecipe, renderSparkBar],
  [sparkLineRecipe, renderSparkLine],
  [calloutRecipe, renderCallout],
  [dataTableRecipe, renderDataTable],
  [badgeDeltaRecipe, renderBadgeDelta],
  [legendRecipe, renderLegend],
  [textBlockRecipe, renderTextBlock],
];

for (const [recipe, renderer] of widgets) {
  tremorServer.registerWidget(recipe as string, renderer);
}

export { tremorServer };
