// @ts-nocheck
// ---------------------------------------------------------------------------
// AntV G6 visualization server — graph & network layouts (v5)
// Force-directed, hierarchical, radial, tree, flow, and specialty layouts.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import forceRecipe from './recipes/force.md?raw';
import d3ForceRecipe from './recipes/d3-force.md?raw';
import circularRecipe from './recipes/circular.md?raw';
import gridRecipe from './recipes/grid.md?raw';
import radialRecipe from './recipes/radial.md?raw';
import concentricRecipe from './recipes/concentric.md?raw';
import dagreRecipe from './recipes/dagre.md?raw';
import treeRecipe from './recipes/tree.md?raw';
import mindmapRecipe from './recipes/mindmap.md?raw';
import indentedTreeRecipe from './recipes/indented-tree.md?raw';
import compactBoxRecipe from './recipes/compact-box.md?raw';
import fruchtermanRecipe from './recipes/fruchterman.md?raw';
import forceAtlas2Recipe from './recipes/force-atlas2.md?raw';
import flowRecipe from './recipes/flow.md?raw';
import arcDiagramRecipe from './recipes/arc-diagram.md?raw';
import chordDiagramRecipe from './recipes/chord-diagram.md?raw';
import egoNetworkRecipe from './recipes/ego-network.md?raw';
import comboRecipe from './recipes/combo.md?raw';
import randomRecipe from './recipes/random.md?raw';
import mdsRecipe from './recipes/mds.md?raw';
import snakeRecipe from './recipes/snake.md?raw';

// Renderers
import { render as renderForce } from './widgets/force.js';
import { render as renderD3Force } from './widgets/d3-force.js';
import { render as renderCircular } from './widgets/circular.js';
import { render as renderGrid } from './widgets/grid.js';
import { render as renderRadial } from './widgets/radial.js';
import { render as renderConcentric } from './widgets/concentric.js';
import { render as renderDagre } from './widgets/dagre.js';
import { render as renderTree } from './widgets/tree.js';
import { render as renderMindmap } from './widgets/mindmap.js';
import { render as renderIndentedTree } from './widgets/indented-tree.js';
import { render as renderCompactBox } from './widgets/compact-box.js';
import { render as renderFruchterman } from './widgets/fruchterman.js';
import { render as renderForceAtlas2 } from './widgets/force-atlas2.js';
import { render as renderFlow } from './widgets/flow.js';
import { render as renderArcDiagram } from './widgets/arc-diagram.js';
import { render as renderChordDiagram } from './widgets/chord-diagram.js';
import { render as renderEgoNetwork } from './widgets/ego-network.js';
import { render as renderCombo } from './widgets/combo.js';
import { render as renderRandom } from './widgets/random.js';
import { render as renderMds } from './widgets/mds.js';
import { render as renderSnake } from './widgets/snake.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const g6Server = createWebMcpServer('g6', {
  description:
    'Graph and network visualizations with AntV G6 v5 — force, dagre, tree, mindmap, radial, flow, arc, chord, ego-network, combo (21 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [forceRecipe, renderForce],
  [d3ForceRecipe, renderD3Force],
  [circularRecipe, renderCircular],
  [gridRecipe, renderGrid],
  [radialRecipe, renderRadial],
  [concentricRecipe, renderConcentric],
  [dagreRecipe, renderDagre],
  [treeRecipe, renderTree],
  [mindmapRecipe, renderMindmap],
  [indentedTreeRecipe, renderIndentedTree],
  [compactBoxRecipe, renderCompactBox],
  [fruchtermanRecipe, renderFruchterman],
  [forceAtlas2Recipe, renderForceAtlas2],
  [flowRecipe, renderFlow],
  [arcDiagramRecipe, renderArcDiagram],
  [chordDiagramRecipe, renderChordDiagram],
  [egoNetworkRecipe, renderEgoNetwork],
  [comboRecipe, renderCombo],
  [randomRecipe, renderRandom],
  [mdsRecipe, renderMds],
  [snakeRecipe, renderSnake],
];

for (const [recipe, renderer] of widgets) {
  g6Server.registerWidget(recipe as string, renderer);
}

export { g6Server };
