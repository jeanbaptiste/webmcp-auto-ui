// @ts-nocheck
// ---------------------------------------------------------------------------
// D3.js visualization server — 26 widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import treemapRecipe from './recipes/treemap.md?raw';
import circlePackRecipe from './recipes/circle-pack.md?raw';
import sunburstRecipe from './recipes/sunburst.md?raw';
import icicleRecipe from './recipes/icicle.md?raw';
import treeRecipe from './recipes/tree.md?raw';
import dendrogramRecipe from './recipes/dendrogram.md?raw';
import forceGraphRecipe from './recipes/force-graph.md?raw';
import chordRecipe from './recipes/chord.md?raw';
import arcChartRecipe from './recipes/arc-chart.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import donutRecipe from './recipes/donut.md?raw';
import lineChartRecipe from './recipes/line-chart.md?raw';
import areaChartRecipe from './recipes/area-chart.md?raw';
import stackedAreaRecipe from './recipes/stacked-area.md?raw';
import stackedBarRecipe from './recipes/stacked-bar.md?raw';
import radialLineRecipe from './recipes/radial-line.md?raw';
import radialAreaRecipe from './recipes/radial-area.md?raw';
import voronoiRecipe from './recipes/voronoi.md?raw';
import delaunayRecipe from './recipes/delaunay.md?raw';
import contourRecipe from './recipes/contour.md?raw';
import densityMapRecipe from './recipes/density-map.md?raw';
import choroplethRecipe from './recipes/choropleth.md?raw';
import globeRecipe from './recipes/globe.md?raw';
import projectionMapRecipe from './recipes/projection-map.md?raw';
import symbolMapRecipe from './recipes/symbol-map.md?raw';
import scatterVoronoiRecipe from './recipes/scatter-voronoi.md?raw';

// Renderers
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderCirclePack } from './widgets/circle-pack.js';
import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderIcicle } from './widgets/icicle.js';
import { render as renderTree } from './widgets/tree.js';
import { render as renderDendrogram } from './widgets/dendrogram.js';
import { render as renderForceGraph } from './widgets/force-graph.js';
import { render as renderChord } from './widgets/chord.js';
import { render as renderArcChart } from './widgets/arc-chart.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderDonut } from './widgets/donut.js';
import { render as renderLineChart } from './widgets/line-chart.js';
import { render as renderAreaChart } from './widgets/area-chart.js';
import { render as renderStackedArea } from './widgets/stacked-area.js';
import { render as renderStackedBar } from './widgets/stacked-bar.js';
import { render as renderRadialLine } from './widgets/radial-line.js';
import { render as renderRadialArea } from './widgets/radial-area.js';
import { render as renderVoronoi } from './widgets/voronoi.js';
import { render as renderDelaunay } from './widgets/delaunay.js';
import { render as renderContour } from './widgets/contour.js';
import { render as renderDensityMap } from './widgets/density-map.js';
import { render as renderChoropleth } from './widgets/choropleth.js';
import { render as renderGlobe } from './widgets/globe.js';
import { render as renderProjectionMap } from './widgets/projection-map.js';
import { render as renderSymbolMap } from './widgets/symbol-map.js';
import { render as renderScatterVoronoi } from './widgets/scatter-voronoi.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const d3server = createWebMcpServer('d3', {
  description:
    'Advanced D3.js visualizations (treemap, sunburst, chord, force graph, contour, choropleth, globe, and more)',
});

const widgets: Array<[string, unknown]> = [
  [treemapRecipe, renderTreemap],
  [circlePackRecipe, renderCirclePack],
  [sunburstRecipe, renderSunburst],
  [icicleRecipe, renderIcicle],
  [treeRecipe, renderTree],
  [dendrogramRecipe, renderDendrogram],
  [forceGraphRecipe, renderForceGraph],
  [chordRecipe, renderChord],
  [arcChartRecipe, renderArcChart],
  [pieRecipe, renderPie],
  [donutRecipe, renderDonut],
  [lineChartRecipe, renderLineChart],
  [areaChartRecipe, renderAreaChart],
  [stackedAreaRecipe, renderStackedArea],
  [stackedBarRecipe, renderStackedBar],
  [radialLineRecipe, renderRadialLine],
  [radialAreaRecipe, renderRadialArea],
  [voronoiRecipe, renderVoronoi],
  [delaunayRecipe, renderDelaunay],
  [contourRecipe, renderContour],
  [densityMapRecipe, renderDensityMap],
  [choroplethRecipe, renderChoropleth],
  [globeRecipe, renderGlobe],
  [projectionMapRecipe, renderProjectionMap],
  [symbolMapRecipe, renderSymbolMap],
  [scatterVoronoiRecipe, renderScatterVoronoi],
];

for (const [recipe, renderer] of widgets) {
  d3server.registerWidget(recipe as string, renderer);
}

export { d3server };
