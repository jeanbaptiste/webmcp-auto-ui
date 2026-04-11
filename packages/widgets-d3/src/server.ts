// @ts-nocheck
// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-d3 — D3.js visualization server
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderChord } from './widgets/chord.js';
import { render as renderContour } from './widgets/contour.js';
import { render as renderVoronoi } from './widgets/voronoi.js';
import { render as renderForceGraph } from './widgets/force-graph.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderPack } from './widgets/pack.js';
import { render as renderRadialBar } from './widgets/radial-bar.js';

// Recipes (imported as raw strings — bundler must support ?raw or equivalent)
import sunburstRecipe from './recipes/sunburst.md?raw';
import chordRecipe from './recipes/chord.md?raw';
import contourRecipe from './recipes/contour.md?raw';
import voronoiRecipe from './recipes/voronoi.md?raw';
import forceGraphRecipe from './recipes/force-graph.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import packRecipe from './recipes/pack.md?raw';
import radialBarRecipe from './recipes/radial-bar.md?raw';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const d3server = createWebMcpServer('d3', {
  description:
    'Advanced D3.js visualizations (sunburst, chord, contour, voronoi, force graph, treemap, pack, radial bar)',
});

const widgets: Array<[string, unknown]> = [
  [sunburstRecipe, renderSunburst],
  [chordRecipe, renderChord],
  [contourRecipe, renderContour],
  [voronoiRecipe, renderVoronoi],
  [forceGraphRecipe, renderForceGraph],
  [treemapRecipe, renderTreemap],
  [packRecipe, renderPack],
  [radialBarRecipe, renderRadialBar],
];

for (const [recipe, renderer] of widgets) {
  d3server.registerWidget(recipe as string, renderer);
}

export { d3server };
