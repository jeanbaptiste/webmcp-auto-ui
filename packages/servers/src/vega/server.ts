// @ts-nocheck
// ---------------------------------------------------------------------------
// Vega / Vega-Lite visualization server — 17 widgets
// Generic spec + common charts + Vega-native specialties
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import specRecipe from './recipes/spec.md?raw';
import barRecipe from './recipes/bar.md?raw';
import lineRecipe from './recipes/line.md?raw';
import scatterRecipe from './recipes/scatter.md?raw';
import areaRecipe from './recipes/area.md?raw';
import histogramRecipe from './recipes/histogram.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import forceRecipe from './recipes/force.md?raw';
import contourRecipe from './recipes/contour.md?raw';
import wordcloudRecipe from './recipes/wordcloud.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import sunburstRecipe from './recipes/sunburst.md?raw';
import chordRecipe from './recipes/chord.md?raw';
import geoRecipe from './recipes/geo.md?raw';
import violinRecipe from './recipes/violin.md?raw';
import boxplotRecipe from './recipes/boxplot.md?raw';
import parallelCoordinatesRecipe from './recipes/parallel-coordinates.md?raw';

// Renderers
import { render as renderSpec } from './widgets/spec.js';
import { render as renderBar } from './widgets/bar.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderArea } from './widgets/area.js';
import { render as renderHistogram } from './widgets/histogram.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderForce } from './widgets/force.js';
import { render as renderContour } from './widgets/contour.js';
import { render as renderWordcloud } from './widgets/wordcloud.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderChord } from './widgets/chord.js';
import { render as renderGeo } from './widgets/geo.js';
import { render as renderViolin } from './widgets/violin.js';
import { render as renderBoxplot } from './widgets/boxplot.js';
import { render as renderParallelCoordinates } from './widgets/parallel-coordinates.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const vegaServer = createWebMcpServer('vega', {
  description:
    'Vega / Vega-Lite charts — generic spec + bar, line, scatter, area, histogram, heatmap, force-directed graph, contour, wordcloud, treemap, sunburst, chord, geo (choropleth), violin, boxplot, parallel-coordinates (17 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [specRecipe, renderSpec],
  [barRecipe, renderBar],
  [lineRecipe, renderLine],
  [scatterRecipe, renderScatter],
  [areaRecipe, renderArea],
  [histogramRecipe, renderHistogram],
  [heatmapRecipe, renderHeatmap],
  [forceRecipe, renderForce],
  [contourRecipe, renderContour],
  [wordcloudRecipe, renderWordcloud],
  [treemapRecipe, renderTreemap],
  [sunburstRecipe, renderSunburst],
  [chordRecipe, renderChord],
  [geoRecipe, renderGeo],
  [violinRecipe, renderViolin],
  [boxplotRecipe, renderBoxplot],
  [parallelCoordinatesRecipe, renderParallelCoordinates],
];

for (const [recipe, renderer] of widgets) {
  vegaServer.registerWidget(recipe as string, renderer);
}

export { vegaServer };
