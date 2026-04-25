// @ts-nocheck
// ---------------------------------------------------------------------------
// Sigma.js + Graphology visualization server — 14 widgets
// WebGL graph rendering with layout and generator widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import graphRecipe from './recipes/graph.md?raw';
import forceAtlas2Recipe from './recipes/force-atlas2.md?raw';
import circularRecipe from './recipes/circular.md?raw';
import randomRecipe from './recipes/random.md?raw';
import clustersRecipe from './recipes/clusters.md?raw';
import degreeSizedRecipe from './recipes/degree-sized.md?raw';
import directedRecipe from './recipes/directed.md?raw';
import edgeWeightsRecipe from './recipes/edge-weights.md?raw';
import labelsZoomRecipe from './recipes/labels-zoom.md?raw';
import multiModalRecipe from './recipes/multi-modal.md?raw';
import hoverHighlightRecipe from './recipes/hover-highlight.md?raw';
import erdosRenyiRecipe from './recipes/erdos-renyi.md?raw';
import completeRecipe from './recipes/complete.md?raw';
import clustersGeneratorRecipe from './recipes/clusters-generator.md?raw';

// Renderers
import { render as renderGraph } from './widgets/graph.js';
import { render as renderForceAtlas2 } from './widgets/force-atlas2.js';
import { render as renderCircular } from './widgets/circular.js';
import { render as renderRandom } from './widgets/random.js';
import { render as renderClusters } from './widgets/clusters.js';
import { render as renderDegreeSized } from './widgets/degree-sized.js';
import { render as renderDirected } from './widgets/directed.js';
import { render as renderEdgeWeights } from './widgets/edge-weights.js';
import { render as renderLabelsZoom } from './widgets/labels-zoom.js';
import { render as renderMultiModal } from './widgets/multi-modal.js';
import { render as renderHoverHighlight } from './widgets/hover-highlight.js';
import { render as renderErdosRenyi } from './widgets/erdos-renyi.js';
import { render as renderComplete } from './widgets/complete.js';
import { render as renderClustersGenerator } from './widgets/clusters-generator.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const sigmaServer = createWebMcpServer('sigma', {
  description:
    'WebGL graph visualization with Sigma.js + Graphology — layouts (ForceAtlas2, circular, random), styling (clusters, degree, weights, multi-modal), interactions (hover-highlight, label-zoom), and generators (Erdős-Rényi, complete, clustered).',
});

const widgets: Array<[string, unknown]> = [
  [graphRecipe, renderGraph],
  [forceAtlas2Recipe, renderForceAtlas2],
  [circularRecipe, renderCircular],
  [randomRecipe, renderRandom],
  [clustersRecipe, renderClusters],
  [degreeSizedRecipe, renderDegreeSized],
  [directedRecipe, renderDirected],
  [edgeWeightsRecipe, renderEdgeWeights],
  [labelsZoomRecipe, renderLabelsZoom],
  [multiModalRecipe, renderMultiModal],
  [hoverHighlightRecipe, renderHoverHighlight],
  [erdosRenyiRecipe, renderErdosRenyi],
  [completeRecipe, renderComplete],
  [clustersGeneratorRecipe, renderClustersGenerator],
];

for (const [recipe, renderer] of widgets) {
  sigmaServer.registerWidget(recipe as string, renderer);
}

export { sigmaServer };
