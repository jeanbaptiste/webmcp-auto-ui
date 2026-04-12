// @ts-nocheck
// ---------------------------------------------------------------------------
// PixiJS WebGL visualization server — 20 widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import lineChartRecipe from './recipes/line-chart.md?raw';
import barChartRecipe from './recipes/bar-chart.md?raw';
import scatterPlotRecipe from './recipes/scatter-plot.md?raw';
import networkGraphRecipe from './recipes/network-graph.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import particleFlowRecipe from './recipes/particle-flow.md?raw';
import gaugeRecipe from './recipes/gauge.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import animatedSpriteRecipe from './recipes/animated-sprite.md?raw';
import waveformRecipe from './recipes/waveform.md?raw';
import bubbleChartRecipe from './recipes/bubble-chart.md?raw';
import worldMapRecipe from './recipes/world-map.md?raw';
import blurOverlayRecipe from './recipes/blur-overlay.md?raw';
import textFeedRecipe from './recipes/text-feed.md?raw';
import progressRingRecipe from './recipes/progress-ring.md?raw';
import calendarHeatmapRecipe from './recipes/calendar-heatmap.md?raw';
import sparklineRecipe from './recipes/sparkline.md?raw';
import funnelChartRecipe from './recipes/funnel-chart.md?raw';
import renderSnapshotRecipe from './recipes/render-snapshot.md?raw';
import noiseBackgroundRecipe from './recipes/noise-background.md?raw';

// Renderers
import { render as renderLineChart } from './widgets/line-chart.js';
import { render as renderBarChart } from './widgets/bar-chart.js';
import { render as renderScatterPlot } from './widgets/scatter-plot.js';
import { render as renderNetworkGraph } from './widgets/network-graph.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderParticleFlow } from './widgets/particle-flow.js';
import { render as renderGauge } from './widgets/gauge.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderAnimatedSprite } from './widgets/animated-sprite.js';
import { render as renderWaveform } from './widgets/waveform.js';
import { render as renderBubbleChart } from './widgets/bubble-chart.js';
import { render as renderWorldMap } from './widgets/world-map.js';
import { render as renderBlurOverlay } from './widgets/blur-overlay.js';
import { render as renderTextFeed } from './widgets/text-feed.js';
import { render as renderProgressRing } from './widgets/progress-ring.js';
import { render as renderCalendarHeatmap } from './widgets/calendar-heatmap.js';
import { render as renderSparkline } from './widgets/sparkline.js';
import { render as renderFunnelChart } from './widgets/funnel-chart.js';
import { render as renderRenderSnapshot } from './widgets/render-snapshot.js';
import { render as renderNoiseBackground } from './widgets/noise-background.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const pixijsServer = createWebMcpServer('pixijs', {
  description: 'Interactive animated visualizations with PixiJS (WebGL 2D)',
});

const widgets: Array<[string, unknown]> = [
  [lineChartRecipe, renderLineChart],
  [barChartRecipe, renderBarChart],
  [scatterPlotRecipe, renderScatterPlot],
  [networkGraphRecipe, renderNetworkGraph],
  [heatmapRecipe, renderHeatmap],
  [particleFlowRecipe, renderParticleFlow],
  [gaugeRecipe, renderGauge],
  [treemapRecipe, renderTreemap],
  [animatedSpriteRecipe, renderAnimatedSprite],
  [waveformRecipe, renderWaveform],
  [bubbleChartRecipe, renderBubbleChart],
  [worldMapRecipe, renderWorldMap],
  [blurOverlayRecipe, renderBlurOverlay],
  [textFeedRecipe, renderTextFeed],
  [progressRingRecipe, renderProgressRing],
  [calendarHeatmapRecipe, renderCalendarHeatmap],
  [sparklineRecipe, renderSparkline],
  [funnelChartRecipe, renderFunnelChart],
  [renderSnapshotRecipe, renderRenderSnapshot],
  [noiseBackgroundRecipe, renderNoiseBackground],
];

for (const [recipe, renderer] of widgets) {
  pixijsServer.registerWidget(recipe as string, renderer);
}

export { pixijsServer };
