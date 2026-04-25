// @ts-nocheck
// ---------------------------------------------------------------------------
// AG Charts (community) visualization server
// Cartesian, polar, hierarchical, financial, gauge & specialty widgets.
// Enterprise-only series types render an inline error hint at runtime
// instead of crashing.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import barRecipe from './recipes/bar.md?raw';
import columnRecipe from './recipes/column.md?raw';
import lineRecipe from './recipes/line.md?raw';
import areaRecipe from './recipes/area.md?raw';
import scatterRecipe from './recipes/scatter.md?raw';
import bubbleRecipe from './recipes/bubble.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import donutRecipe from './recipes/donut.md?raw';
import rangeBarRecipe from './recipes/range-bar.md?raw';
import rangeAreaRecipe from './recipes/range-area.md?raw';
import boxPlotRecipe from './recipes/box-plot.md?raw';
import candlestickRecipe from './recipes/candlestick.md?raw';
import ohlcRecipe from './recipes/ohlc.md?raw';
import histogramRecipe from './recipes/histogram.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import sunburstRecipe from './recipes/sunburst.md?raw';
import waterfallRecipe from './recipes/waterfall.md?raw';
import funnelRecipe from './recipes/funnel.md?raw';
import coneFunnelRecipe from './recipes/cone-funnel.md?raw';
import radialBarRecipe from './recipes/radial-bar.md?raw';
import radialColumnRecipe from './recipes/radial-column.md?raw';
import nightingaleRecipe from './recipes/nightingale.md?raw';
import radarLineRecipe from './recipes/radar-line.md?raw';
import radarAreaRecipe from './recipes/radar-area.md?raw';
import sankeyRecipe from './recipes/sankey.md?raw';
import gaugeRecipe from './recipes/gauge.md?raw';
import linearGaugeRecipe from './recipes/linear-gauge.md?raw';
import bulletRecipe from './recipes/bullet.md?raw';

// Renderers
import { render as renderBar } from './widgets/bar.js';
import { render as renderColumn } from './widgets/column.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderArea } from './widgets/area.js';
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderBubble } from './widgets/bubble.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderDonut } from './widgets/donut.js';
import { render as renderRangeBar } from './widgets/range-bar.js';
import { render as renderRangeArea } from './widgets/range-area.js';
import { render as renderBoxPlot } from './widgets/box-plot.js';
import { render as renderCandlestick } from './widgets/candlestick.js';
import { render as renderOhlc } from './widgets/ohlc.js';
import { render as renderHistogram } from './widgets/histogram.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderWaterfall } from './widgets/waterfall.js';
import { render as renderFunnel } from './widgets/funnel.js';
import { render as renderConeFunnel } from './widgets/cone-funnel.js';
import { render as renderRadialBar } from './widgets/radial-bar.js';
import { render as renderRadialColumn } from './widgets/radial-column.js';
import { render as renderNightingale } from './widgets/nightingale.js';
import { render as renderRadarLine } from './widgets/radar-line.js';
import { render as renderRadarArea } from './widgets/radar-area.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderGauge } from './widgets/gauge.js';
import { render as renderLinearGauge } from './widgets/linear-gauge.js';
import { render as renderBullet } from './widgets/bullet.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const agChartsServer = createWebMcpServer('agcharts', {
  description:
    'AG Charts (community) — bar/column/line/area/scatter/bubble, pie/donut, range, box-plot, candlestick/OHLC, histogram, heatmap, treemap/sunburst, waterfall, funnel, radial/radar, sankey, gauges & bullet (29 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [barRecipe, renderBar],
  [columnRecipe, renderColumn],
  [lineRecipe, renderLine],
  [areaRecipe, renderArea],
  [scatterRecipe, renderScatter],
  [bubbleRecipe, renderBubble],
  [pieRecipe, renderPie],
  [donutRecipe, renderDonut],
  [rangeBarRecipe, renderRangeBar],
  [rangeAreaRecipe, renderRangeArea],
  [boxPlotRecipe, renderBoxPlot],
  [candlestickRecipe, renderCandlestick],
  [ohlcRecipe, renderOhlc],
  [histogramRecipe, renderHistogram],
  [heatmapRecipe, renderHeatmap],
  [treemapRecipe, renderTreemap],
  [sunburstRecipe, renderSunburst],
  [waterfallRecipe, renderWaterfall],
  [funnelRecipe, renderFunnel],
  [coneFunnelRecipe, renderConeFunnel],
  [radialBarRecipe, renderRadialBar],
  [radialColumnRecipe, renderRadialColumn],
  [nightingaleRecipe, renderNightingale],
  [radarLineRecipe, renderRadarLine],
  [radarAreaRecipe, renderRadarArea],
  [sankeyRecipe, renderSankey],
  [gaugeRecipe, renderGauge],
  [linearGaugeRecipe, renderLinearGauge],
  [bulletRecipe, renderBullet],
];

for (const [recipe, renderer] of widgets) {
  agChartsServer.registerWidget(recipe as string, renderer);
}

export { agChartsServer };
