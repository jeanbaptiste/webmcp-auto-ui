// @ts-nocheck
// ---------------------------------------------------------------------------
// Nivo visualization server — 24 widgets
// React-based charts: bar, line, pie, scatter, heatmap, radar, sankey,
// sunburst, treemap, calendar, chord, stream, swarmplot, waffle, funnel,
// network, parallel-coordinates, boxplot, voronoi, marimekko, tree, geo,
// circle-packing, bullet
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes (frontmatter + prose, bundled as raw text by Vite)
import barRecipe from './recipes/bar.md?raw';
import lineRecipe from './recipes/line.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import scatterplotRecipe from './recipes/scatterplot.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import radarRecipe from './recipes/radar.md?raw';
import sankeyRecipe from './recipes/sankey.md?raw';
import sunburstRecipe from './recipes/sunburst.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import calendarRecipe from './recipes/calendar.md?raw';
import chordRecipe from './recipes/chord.md?raw';
import streamRecipe from './recipes/stream.md?raw';
import swarmplotRecipe from './recipes/swarmplot.md?raw';
import waffleRecipe from './recipes/waffle.md?raw';
import funnelRecipe from './recipes/funnel.md?raw';
import networkRecipe from './recipes/network.md?raw';
import parallelCoordinatesRecipe from './recipes/parallel-coordinates.md?raw';
import boxplotRecipe from './recipes/boxplot.md?raw';
import voronoiRecipe from './recipes/voronoi.md?raw';
import marimekkoRecipe from './recipes/marimekko.md?raw';
import treeRecipe from './recipes/tree.md?raw';
import geoRecipe from './recipes/geo.md?raw';
import circlePackingRecipe from './recipes/circle-packing.md?raw';
import bulletRecipe from './recipes/bullet.md?raw';

// Renderers
import { render as renderBar } from './widgets/bar.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderScatterplot } from './widgets/scatterplot.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderRadar } from './widgets/radar.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderCalendar } from './widgets/calendar.js';
import { render as renderChord } from './widgets/chord.js';
import { render as renderStream } from './widgets/stream.js';
import { render as renderSwarmplot } from './widgets/swarmplot.js';
import { render as renderWaffle } from './widgets/waffle.js';
import { render as renderFunnel } from './widgets/funnel.js';
import { render as renderNetwork } from './widgets/network.js';
import { render as renderParallelCoordinates } from './widgets/parallel-coordinates.js';
import { render as renderBoxplot } from './widgets/boxplot.js';
import { render as renderVoronoi } from './widgets/voronoi.js';
import { render as renderMarimekko } from './widgets/marimekko.js';
import { render as renderTree } from './widgets/tree.js';
import { render as renderGeo } from './widgets/geo.js';
import { render as renderCirclePacking } from './widgets/circle-packing.js';
import { render as renderBullet } from './widgets/bullet.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const nivoServer = createWebMcpServer('nivo', {
  description:
    'React-based charts with Nivo — bar, line, pie, scatter, heatmap, radar, sankey, sunburst, treemap, calendar, chord, stream, swarmplot, waffle, funnel, network, parallel-coordinates, boxplot, voronoi, marimekko, tree, geo, circle-packing, bullet (24 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [barRecipe, renderBar],
  [lineRecipe, renderLine],
  [pieRecipe, renderPie],
  [scatterplotRecipe, renderScatterplot],
  [heatmapRecipe, renderHeatmap],
  [radarRecipe, renderRadar],
  [sankeyRecipe, renderSankey],
  [sunburstRecipe, renderSunburst],
  [treemapRecipe, renderTreemap],
  [calendarRecipe, renderCalendar],
  [chordRecipe, renderChord],
  [streamRecipe, renderStream],
  [swarmplotRecipe, renderSwarmplot],
  [waffleRecipe, renderWaffle],
  [funnelRecipe, renderFunnel],
  [networkRecipe, renderNetwork],
  [parallelCoordinatesRecipe, renderParallelCoordinates],
  [boxplotRecipe, renderBoxplot],
  [voronoiRecipe, renderVoronoi],
  [marimekkoRecipe, renderMarimekko],
  [treeRecipe, renderTree],
  [geoRecipe, renderGeo],
  [circlePackingRecipe, renderCirclePacking],
  [bulletRecipe, renderBullet],
];

for (const [recipe, renderer] of widgets) {
  nivoServer.registerWidget(recipe as string, renderer);
}

export { nivoServer };
