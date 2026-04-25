// @ts-nocheck
// ---------------------------------------------------------------------------
// FINOS Perspective visualization server — pivot tables + d3fc charts
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import tableRecipe from './recipes/table.md?raw';
import pivotRecipe from './recipes/pivot.md?raw';
import barRecipe from './recipes/bar.md?raw';
import columnRecipe from './recipes/column.md?raw';
import xBarRecipe from './recipes/x-bar.md?raw';
import yBarRecipe from './recipes/y-bar.md?raw';
import lineRecipe from './recipes/line.md?raw';
import yLineRecipe from './recipes/y-line.md?raw';
import areaRecipe from './recipes/area.md?raw';
import yAreaRecipe from './recipes/y-area.md?raw';
import scatterRecipe from './recipes/scatter.md?raw';
import yScatterRecipe from './recipes/y-scatter.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import sunburstRecipe from './recipes/sunburst.md?raw';
import candlestickRecipe from './recipes/candlestick.md?raw';
import ohlcRecipe from './recipes/ohlc.md?raw';

// Renderers
import { render as renderTable } from './widgets/table.js';
import { render as renderPivot } from './widgets/pivot.js';
import { render as renderBar } from './widgets/bar.js';
import { render as renderColumn } from './widgets/column.js';
import { render as renderXBar } from './widgets/x-bar.js';
import { render as renderYBar } from './widgets/y-bar.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderYLine } from './widgets/y-line.js';
import { render as renderArea } from './widgets/area.js';
import { render as renderYArea } from './widgets/y-area.js';
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderYScatter } from './widgets/y-scatter.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderCandlestick } from './widgets/candlestick.js';
import { render as renderOhlc } from './widgets/ohlc.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const perspectiveServer = createWebMcpServer('perspective', {
  description:
    'FINOS Perspective — interactive pivot tables and d3fc charts (datagrid, pivot, bar, column, line, area, scatter, heatmap, treemap, sunburst, candlestick, ohlc) for streaming and analytical workloads',
});

const widgets: Array<[string, unknown]> = [
  [tableRecipe, renderTable],
  [pivotRecipe, renderPivot],
  [barRecipe, renderBar],
  [columnRecipe, renderColumn],
  [xBarRecipe, renderXBar],
  [yBarRecipe, renderYBar],
  [lineRecipe, renderLine],
  [yLineRecipe, renderYLine],
  [areaRecipe, renderArea],
  [yAreaRecipe, renderYArea],
  [scatterRecipe, renderScatter],
  [yScatterRecipe, renderYScatter],
  [heatmapRecipe, renderHeatmap],
  [treemapRecipe, renderTreemap],
  [sunburstRecipe, renderSunburst],
  [candlestickRecipe, renderCandlestick],
  [ohlcRecipe, renderOhlc],
];

for (const [recipe, renderer] of widgets) {
  perspectiveServer.registerWidget(recipe as string, renderer);
}

export { perspectiveServer };
