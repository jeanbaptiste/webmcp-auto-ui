// @ts-nocheck
// ---------------------------------------------------------------------------
// Observable Plot visualization server — mark-per-widget architecture.
// One widget per useful Plot mark (dot, bar, line, area, rect, cell, tick,
// rule, frame, text, image, arrow, vector, link, density, contour, hexbin,
// hexgrid, box, bollinger, delaunay, voronoi, geo, graticule, tree, waffle,
// auto, tip, stack, axis) + a generic `spec` widget accepting a full config.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes (markdown)
import dotRecipe from './recipes/dot.md?raw';
import barXRecipe from './recipes/barX.md?raw';
import barYRecipe from './recipes/barY.md?raw';
import lineRecipe from './recipes/line.md?raw';
import lineXRecipe from './recipes/lineX.md?raw';
import lineYRecipe from './recipes/lineY.md?raw';
import areaXRecipe from './recipes/areaX.md?raw';
import areaYRecipe from './recipes/areaY.md?raw';
import rectRecipe from './recipes/rect.md?raw';
import cellRecipe from './recipes/cell.md?raw';
import tickRecipe from './recipes/tick.md?raw';
import ruleRecipe from './recipes/rule.md?raw';
import frameRecipe from './recipes/frame.md?raw';
import textRecipe from './recipes/text.md?raw';
import imageRecipe from './recipes/image.md?raw';
import arrowRecipe from './recipes/arrow.md?raw';
import vectorRecipe from './recipes/vector.md?raw';
import linkRecipe from './recipes/link.md?raw';
import densityRecipe from './recipes/density.md?raw';
import contourRecipe from './recipes/contour.md?raw';
import hexbinRecipe from './recipes/hexbin.md?raw';
import hexgridRecipe from './recipes/hexgrid.md?raw';
import boxXRecipe from './recipes/boxX.md?raw';
import boxYRecipe from './recipes/boxY.md?raw';
import bollingerRecipe from './recipes/bollinger.md?raw';
import delaunayRecipe from './recipes/delaunay.md?raw';
import voronoiRecipe from './recipes/voronoi.md?raw';
import voronoiMeshRecipe from './recipes/voronoiMesh.md?raw';
import geoRecipe from './recipes/geo.md?raw';
import graticuleRecipe from './recipes/graticule.md?raw';
import treeRecipe from './recipes/tree.md?raw';
import waffleRecipe from './recipes/waffle.md?raw';
import autoRecipe from './recipes/auto.md?raw';
import tipRecipe from './recipes/tip.md?raw';
import stackYRecipe from './recipes/stackY.md?raw';
import stackXRecipe from './recipes/stackX.md?raw';
import axisRecipe from './recipes/axis.md?raw';
import specRecipe from './recipes/spec.md?raw';

// Renderers
import { render as renderDot } from './widgets/dot.js';
import { render as renderBarX } from './widgets/barX.js';
import { render as renderBarY } from './widgets/barY.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderLineX } from './widgets/lineX.js';
import { render as renderLineY } from './widgets/lineY.js';
import { render as renderAreaX } from './widgets/areaX.js';
import { render as renderAreaY } from './widgets/areaY.js';
import { render as renderRect } from './widgets/rect.js';
import { render as renderCell } from './widgets/cell.js';
import { render as renderTick } from './widgets/tick.js';
import { render as renderRule } from './widgets/rule.js';
import { render as renderFrame } from './widgets/frame.js';
import { render as renderText } from './widgets/text.js';
import { render as renderImage } from './widgets/image.js';
import { render as renderArrow } from './widgets/arrow.js';
import { render as renderVector } from './widgets/vector.js';
import { render as renderLink } from './widgets/link.js';
import { render as renderDensity } from './widgets/density.js';
import { render as renderContour } from './widgets/contour.js';
import { render as renderHexbin } from './widgets/hexbin.js';
import { render as renderHexgrid } from './widgets/hexgrid.js';
import { render as renderBoxX } from './widgets/boxX.js';
import { render as renderBoxY } from './widgets/boxY.js';
import { render as renderBollinger } from './widgets/bollinger.js';
import { render as renderDelaunay } from './widgets/delaunay.js';
import { render as renderVoronoi } from './widgets/voronoi.js';
import { render as renderVoronoiMesh } from './widgets/voronoiMesh.js';
import { render as renderGeo } from './widgets/geo.js';
import { render as renderGraticule } from './widgets/graticule.js';
import { render as renderTree } from './widgets/tree.js';
import { render as renderWaffle } from './widgets/waffle.js';
import { render as renderAuto } from './widgets/auto.js';
import { render as renderTip } from './widgets/tip.js';
import { render as renderStackY } from './widgets/stackY.js';
import { render as renderStackX } from './widgets/stackX.js';
import { render as renderAxis } from './widgets/axis.js';
import { render as renderSpec } from './widgets/spec.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const observablePlotServer = createWebMcpServer('observable-plot', {
  description:
    'Grammar-of-graphics charts with Observable Plot — one widget per mark (dot, bar, line, area, rect, cell, tick, rule, text, image, arrow, vector, link, density, contour, hexbin, box, bollinger, delaunay, voronoi, geo, graticule, tree, waffle, auto, tip, stack, axis) + generic `spec` widget',
});

const widgets: Array<[string, unknown]> = [
  [dotRecipe, renderDot],
  [barXRecipe, renderBarX],
  [barYRecipe, renderBarY],
  [lineRecipe, renderLine],
  [lineXRecipe, renderLineX],
  [lineYRecipe, renderLineY],
  [areaXRecipe, renderAreaX],
  [areaYRecipe, renderAreaY],
  [rectRecipe, renderRect],
  [cellRecipe, renderCell],
  [tickRecipe, renderTick],
  [ruleRecipe, renderRule],
  [frameRecipe, renderFrame],
  [textRecipe, renderText],
  [imageRecipe, renderImage],
  [arrowRecipe, renderArrow],
  [vectorRecipe, renderVector],
  [linkRecipe, renderLink],
  [densityRecipe, renderDensity],
  [contourRecipe, renderContour],
  [hexbinRecipe, renderHexbin],
  [hexgridRecipe, renderHexgrid],
  [boxXRecipe, renderBoxX],
  [boxYRecipe, renderBoxY],
  [bollingerRecipe, renderBollinger],
  [delaunayRecipe, renderDelaunay],
  [voronoiRecipe, renderVoronoi],
  [voronoiMeshRecipe, renderVoronoiMesh],
  [geoRecipe, renderGeo],
  [graticuleRecipe, renderGraticule],
  [treeRecipe, renderTree],
  [waffleRecipe, renderWaffle],
  [autoRecipe, renderAuto],
  [tipRecipe, renderTip],
  [stackYRecipe, renderStackY],
  [stackXRecipe, renderStackX],
  [axisRecipe, renderAxis],
  [specRecipe, renderSpec],
];

for (const [recipe, renderer] of widgets) {
  observablePlotServer.registerWidget(recipe as string, renderer);
}

export { observablePlotServer };
