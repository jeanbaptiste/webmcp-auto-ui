// @ts-nocheck
// ---------------------------------------------------------------------------
// Turf.js geospatial-analysis server — 33 widgets
// Each widget runs a turf operation and renders input + result on a MapLibre
// canvas (with an HTML overlay label for measure widgets).
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes — operations on geometries
import bufferRecipe from './recipes/buffer.md?raw';
import unionRecipe from './recipes/union.md?raw';
import intersectRecipe from './recipes/intersect.md?raw';
import differenceRecipe from './recipes/difference.md?raw';
import bboxPolygonRecipe from './recipes/bbox-polygon.md?raw';
import convexRecipe from './recipes/convex.md?raw';
import concaveRecipe from './recipes/concave.md?raw';
import envelopeRecipe from './recipes/envelope.md?raw';
import bezierRecipe from './recipes/bezier.md?raw';
import simplifyRecipe from './recipes/simplify.md?raw';
import cleanCoordsRecipe from './recipes/clean-coords.md?raw';
import flipRecipe from './recipes/flip.md?raw';

// Recipes — measures and points
import alongRecipe from './recipes/along.md?raw';
import centerRecipe from './recipes/center.md?raw';
import centroidRecipe from './recipes/centroid.md?raw';
import centerOfMassRecipe from './recipes/center-of-mass.md?raw';
import midpointRecipe from './recipes/midpoint.md?raw';
import destinationRecipe from './recipes/destination.md?raw';
import distanceRecipe from './recipes/distance.md?raw';
import bearingRecipe from './recipes/bearing.md?raw';
import areaRecipe from './recipes/area.md?raw';

// Recipes — aggregation/transformations
import pointsWithinPolygonRecipe from './recipes/points-within-polygon.md?raw';
import tagRecipe from './recipes/tag.md?raw';
import collectRecipe from './recipes/collect.md?raw';
import clustersKmeansRecipe from './recipes/clusters-kmeans.md?raw';
import clustersDbscanRecipe from './recipes/clusters-dbscan.md?raw';
import nearestPointRecipe from './recipes/nearest-point.md?raw';
import tinRecipe from './recipes/tin.md?raw';

// Recipes — random/grids/sample
import randomPointRecipe from './recipes/random-point.md?raw';
import squareGridRecipe from './recipes/square-grid.md?raw';
import hexGridRecipe from './recipes/hex-grid.md?raw';
import triangleGridRecipe from './recipes/triangle-grid.md?raw';
import pointGridRecipe from './recipes/point-grid.md?raw';
import sampleRecipe from './recipes/sample.md?raw';

// Recipes — booleans
import booleanContainsRecipe from './recipes/boolean-contains.md?raw';
import booleanIntersectsRecipe from './recipes/boolean-intersects.md?raw';
import booleanOverlapRecipe from './recipes/boolean-overlap.md?raw';

// Renderers
import { render as renderBuffer } from './widgets/buffer.js';
import { render as renderUnion } from './widgets/union.js';
import { render as renderIntersect } from './widgets/intersect.js';
import { render as renderDifference } from './widgets/difference.js';
import { render as renderBboxPolygon } from './widgets/bbox-polygon.js';
import { render as renderConvex } from './widgets/convex.js';
import { render as renderConcave } from './widgets/concave.js';
import { render as renderEnvelope } from './widgets/envelope.js';
import { render as renderBezier } from './widgets/bezier.js';
import { render as renderSimplify } from './widgets/simplify.js';
import { render as renderCleanCoords } from './widgets/clean-coords.js';
import { render as renderFlip } from './widgets/flip.js';
import { render as renderAlong } from './widgets/along.js';
import { render as renderCenter } from './widgets/center.js';
import { render as renderCentroid } from './widgets/centroid.js';
import { render as renderCenterOfMass } from './widgets/center-of-mass.js';
import { render as renderMidpoint } from './widgets/midpoint.js';
import { render as renderDestination } from './widgets/destination.js';
import { render as renderDistance } from './widgets/distance.js';
import { render as renderBearing } from './widgets/bearing.js';
import { render as renderArea } from './widgets/area.js';
import { render as renderPointsWithinPolygon } from './widgets/points-within-polygon.js';
import { render as renderTag } from './widgets/tag.js';
import { render as renderCollect } from './widgets/collect.js';
import { render as renderClustersKmeans } from './widgets/clusters-kmeans.js';
import { render as renderClustersDbscan } from './widgets/clusters-dbscan.js';
import { render as renderNearestPoint } from './widgets/nearest-point.js';
import { render as renderTin } from './widgets/tin.js';
import { render as renderRandomPoint } from './widgets/random-point.js';
import { render as renderSquareGrid } from './widgets/square-grid.js';
import { render as renderHexGrid } from './widgets/hex-grid.js';
import { render as renderTriangleGrid } from './widgets/triangle-grid.js';
import { render as renderPointGrid } from './widgets/point-grid.js';
import { render as renderSample } from './widgets/sample.js';
import { render as renderBooleanContains } from './widgets/boolean-contains.js';
import { render as renderBooleanIntersects } from './widgets/boolean-intersects.js';
import { render as renderBooleanOverlap } from './widgets/boolean-overlap.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const turfServer = createWebMcpServer('turf', {
  description:
    'Turf.js geospatial analysis — buffer, union, intersect, hulls, grids, clustering, distance/bearing/area, point-in-polygon, sampling, boolean tests (33 widgets, all rendered on MapLibre)',
});

const widgets: Array<[string, unknown]> = [
  // Operations on geometries
  [bufferRecipe, renderBuffer],
  [unionRecipe, renderUnion],
  [intersectRecipe, renderIntersect],
  [differenceRecipe, renderDifference],
  [bboxPolygonRecipe, renderBboxPolygon],
  [convexRecipe, renderConvex],
  [concaveRecipe, renderConcave],
  [envelopeRecipe, renderEnvelope],
  [bezierRecipe, renderBezier],
  [simplifyRecipe, renderSimplify],
  [cleanCoordsRecipe, renderCleanCoords],
  [flipRecipe, renderFlip],
  // Measures and points
  [alongRecipe, renderAlong],
  [centerRecipe, renderCenter],
  [centroidRecipe, renderCentroid],
  [centerOfMassRecipe, renderCenterOfMass],
  [midpointRecipe, renderMidpoint],
  [destinationRecipe, renderDestination],
  [distanceRecipe, renderDistance],
  [bearingRecipe, renderBearing],
  [areaRecipe, renderArea],
  // Aggregation / transformations
  [pointsWithinPolygonRecipe, renderPointsWithinPolygon],
  [tagRecipe, renderTag],
  [collectRecipe, renderCollect],
  [clustersKmeansRecipe, renderClustersKmeans],
  [clustersDbscanRecipe, renderClustersDbscan],
  [nearestPointRecipe, renderNearestPoint],
  [tinRecipe, renderTin],
  // Random / grids / sample
  [randomPointRecipe, renderRandomPoint],
  [squareGridRecipe, renderSquareGrid],
  [hexGridRecipe, renderHexGrid],
  [triangleGridRecipe, renderTriangleGrid],
  [pointGridRecipe, renderPointGrid],
  [sampleRecipe, renderSample],
  // Booleans
  [booleanContainsRecipe, renderBooleanContains],
  [booleanIntersectsRecipe, renderBooleanIntersects],
  [booleanOverlapRecipe, renderBooleanOverlap],
];

for (const [recipe, renderer] of widgets) {
  turfServer.registerWidget(recipe as string, renderer);
}

export { turfServer };
