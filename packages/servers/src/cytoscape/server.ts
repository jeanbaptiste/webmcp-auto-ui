// @ts-nocheck
// ---------------------------------------------------------------------------
// Cytoscape.js visualization server — 20 widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import graphForceRecipe from './recipes/graph-force.md?raw';
import graphForceCompoundRecipe from './recipes/graph-force-compound.md?raw';
import graphForceFastRecipe from './recipes/graph-force-fast.md?raw';
import treeHierarchyRecipe from './recipes/tree-hierarchy.md?raw';
import dagFlowRecipe from './recipes/dag-flow.md?raw';
import dagLayeredRecipe from './recipes/dag-layered.md?raw';
import circleGraphRecipe from './recipes/circle-graph.md?raw';
import concentricRingsRecipe from './recipes/concentric-rings.md?raw';
import gridMapRecipe from './recipes/grid-map.md?raw';
import fixedPositionsRecipe from './recipes/fixed-positions.md?raw';
import clusterCirclesRecipe from './recipes/cluster-circles.md?raw';
import spreadLayoutRecipe from './recipes/spread-layout.md?raw';
import constrainedLayoutRecipe from './recipes/constrained-layout.md?raw';
import physicsSimulationRecipe from './recipes/physics-simulation.md?raw';
import compoundTreeRecipe from './recipes/compound-tree.md?raw';
import pagerankGraphRecipe from './recipes/pagerank-graph.md?raw';
import shortestPathRecipe from './recipes/shortest-path.md?raw';
import centralityMapRecipe from './recipes/centrality-map.md?raw';
import animatedFlowRecipe from './recipes/animated-flow.md?raw';
import timelineGraphRecipe from './recipes/timeline-graph.md?raw';

// Renderers
import { render as renderGraphForce } from './widgets/graph-force.js';
import { render as renderGraphForceCompound } from './widgets/graph-force-compound.js';
import { render as renderGraphForceFast } from './widgets/graph-force-fast.js';
import { render as renderTreeHierarchy } from './widgets/tree-hierarchy.js';
import { render as renderDagFlow } from './widgets/dag-flow.js';
import { render as renderDagLayered } from './widgets/dag-layered.js';
import { render as renderCircleGraph } from './widgets/circle-graph.js';
import { render as renderConcentricRings } from './widgets/concentric-rings.js';
import { render as renderGridMap } from './widgets/grid-map.js';
import { render as renderFixedPositions } from './widgets/fixed-positions.js';
import { render as renderClusterCircles } from './widgets/cluster-circles.js';
import { render as renderSpreadLayout } from './widgets/spread-layout.js';
import { render as renderConstrainedLayout } from './widgets/constrained-layout.js';
import { render as renderPhysicsSimulation } from './widgets/physics-simulation.js';
import { render as renderCompoundTree } from './widgets/compound-tree.js';
import { render as renderPagerankGraph } from './widgets/pagerank-graph.js';
import { render as renderShortestPath } from './widgets/shortest-path.js';
import { render as renderCentralityMap } from './widgets/centrality-map.js';
import { render as renderAnimatedFlow } from './widgets/animated-flow.js';
import { render as renderTimelineGraph } from './widgets/timeline-graph.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sort elements so nodes come before edges — Cytoscape requires source/target
 *  nodes to exist before edges referencing them are added.
 *  Note: deep-clone (for Svelte proxy stripping) is handled by mountWidget in core. */
function withSortedElements(renderer: (container: HTMLElement, data: Record<string, unknown>) => Promise<void | (() => void)>) {
  return (container: HTMLElement, data: Record<string, unknown>) => {
    const elements = data.elements;
    if (Array.isArray(elements)) {
      elements.sort((a: any, b: any) => {
        const aIsEdge = a?.data?.source !== undefined ? 1 : 0;
        const bIsEdge = b?.data?.source !== undefined ? 1 : 0;
        return aIsEdge - bIsEdge;
      });
    }
    return renderer(container, data);
  };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const cytoscapeServer = createWebMcpServer('cytoscape', {
  description: 'Graph and network visualizations with Cytoscape.js',
});

const widgets: Array<[string, unknown]> = [
  [graphForceRecipe, withSortedElements(renderGraphForce)],
  [graphForceCompoundRecipe, withSortedElements(renderGraphForceCompound)],
  [graphForceFastRecipe, withSortedElements(renderGraphForceFast)],
  [treeHierarchyRecipe, withSortedElements(renderTreeHierarchy)],
  [dagFlowRecipe, withSortedElements(renderDagFlow)],
  [dagLayeredRecipe, withSortedElements(renderDagLayered)],
  [circleGraphRecipe, withSortedElements(renderCircleGraph)],
  [concentricRingsRecipe, withSortedElements(renderConcentricRings)],
  [gridMapRecipe, withSortedElements(renderGridMap)],
  [fixedPositionsRecipe, withSortedElements(renderFixedPositions)],
  [clusterCirclesRecipe, withSortedElements(renderClusterCircles)],
  [spreadLayoutRecipe, withSortedElements(renderSpreadLayout)],
  [constrainedLayoutRecipe, withSortedElements(renderConstrainedLayout)],
  [physicsSimulationRecipe, withSortedElements(renderPhysicsSimulation)],
  [compoundTreeRecipe, withSortedElements(renderCompoundTree)],
  [pagerankGraphRecipe, withSortedElements(renderPagerankGraph)],
  [shortestPathRecipe, withSortedElements(renderShortestPath)],
  [centralityMapRecipe, withSortedElements(renderCentralityMap)],
  [animatedFlowRecipe, withSortedElements(renderAnimatedFlow)],
  [timelineGraphRecipe, withSortedElements(renderTimelineGraph)],
];

for (const [recipe, renderer] of widgets) {
  cytoscapeServer.registerWidget(recipe as string, renderer);
}

export { cytoscapeServer };
