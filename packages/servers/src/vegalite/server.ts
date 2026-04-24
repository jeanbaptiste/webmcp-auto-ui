// @ts-nocheck
// ---------------------------------------------------------------------------
// Vega-Lite visualization server — concise grammar (mark + encoding)
// 25 widgets covering marks, statistical transforms and composition primitives
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import barRecipe from './recipes/bar.md?raw';
import lineRecipe from './recipes/line.md?raw';
import areaRecipe from './recipes/area.md?raw';
import pointRecipe from './recipes/point.md?raw';
import circleRecipe from './recipes/circle.md?raw';
import squareRecipe from './recipes/square.md?raw';
import tickRecipe from './recipes/tick.md?raw';
import ruleRecipe from './recipes/rule.md?raw';
import textRecipe from './recipes/text.md?raw';
import boxplotRecipe from './recipes/boxplot.md?raw';
import errorbarRecipe from './recipes/errorbar.md?raw';
import errorbandRecipe from './recipes/errorband.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import arcRecipe from './recipes/arc.md?raw';
import geoshapeRecipe from './recipes/geoshape.md?raw';
import trailRecipe from './recipes/trail.md?raw';
import violinRecipe from './recipes/violin.md?raw';
import densityRecipe from './recipes/density.md?raw';
import regressionRecipe from './recipes/regression.md?raw';
import loessRecipe from './recipes/loess.md?raw';
import histogramRecipe from './recipes/histogram.md?raw';
import facetRecipe from './recipes/facet.md?raw';
import layeredRecipe from './recipes/layered.md?raw';
import repeatRecipe from './recipes/repeat.md?raw';
import concatRecipe from './recipes/concat.md?raw';
import specRecipe from './recipes/spec.md?raw';

// Renderers
import { render as renderBar } from './widgets/bar.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderArea } from './widgets/area.js';
import { render as renderPoint } from './widgets/point.js';
import { render as renderCircle } from './widgets/circle.js';
import { render as renderSquare } from './widgets/square.js';
import { render as renderTick } from './widgets/tick.js';
import { render as renderRule } from './widgets/rule.js';
import { render as renderText } from './widgets/text.js';
import { render as renderBoxplot } from './widgets/boxplot.js';
import { render as renderErrorbar } from './widgets/errorbar.js';
import { render as renderErrorband } from './widgets/errorband.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderArc } from './widgets/arc.js';
import { render as renderGeoshape } from './widgets/geoshape.js';
import { render as renderTrail } from './widgets/trail.js';
import { render as renderViolin } from './widgets/violin.js';
import { render as renderDensity } from './widgets/density.js';
import { render as renderRegression } from './widgets/regression.js';
import { render as renderLoess } from './widgets/loess.js';
import { render as renderHistogram } from './widgets/histogram.js';
import { render as renderFacet } from './widgets/facet.js';
import { render as renderLayered } from './widgets/layered.js';
import { render as renderRepeat } from './widgets/repeat.js';
import { render as renderConcat } from './widgets/concat.js';
import { render as renderSpec } from './widgets/spec.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const vegaLiteServer = createWebMcpServer('vegalite', {
  description:
    'Concise grammar-of-graphics charts with Vega-Lite — bar, line, area, scatter, boxplot, violin, density, heatmap, geoshape, faceted/layered/repeat composition, plus a spec escape hatch (26 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [barRecipe, renderBar],
  [lineRecipe, renderLine],
  [areaRecipe, renderArea],
  [pointRecipe, renderPoint],
  [circleRecipe, renderCircle],
  [squareRecipe, renderSquare],
  [tickRecipe, renderTick],
  [ruleRecipe, renderRule],
  [textRecipe, renderText],
  [boxplotRecipe, renderBoxplot],
  [errorbarRecipe, renderErrorbar],
  [errorbandRecipe, renderErrorband],
  [heatmapRecipe, renderHeatmap],
  [arcRecipe, renderArc],
  [geoshapeRecipe, renderGeoshape],
  [trailRecipe, renderTrail],
  [violinRecipe, renderViolin],
  [densityRecipe, renderDensity],
  [regressionRecipe, renderRegression],
  [loessRecipe, renderLoess],
  [histogramRecipe, renderHistogram],
  [facetRecipe, renderFacet],
  [layeredRecipe, renderLayered],
  [repeatRecipe, renderRepeat],
  [concatRecipe, renderConcat],
  [specRecipe, renderSpec],
];

for (const [recipe, renderer] of widgets) {
  vegaLiteServer.registerWidget(recipe as string, renderer);
}

export { vegaLiteServer };
