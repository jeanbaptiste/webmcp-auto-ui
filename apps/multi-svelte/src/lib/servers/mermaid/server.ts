// @ts-nocheck
// ---------------------------------------------------------------------------
// Mermaid diagram server — 21 widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import flowchartRecipe from './recipes/flowchart.md?raw';
import sequenceRecipe from './recipes/sequence.md?raw';
import classRecipe from './recipes/class.md?raw';
import stateRecipe from './recipes/state.md?raw';
import erRecipe from './recipes/er.md?raw';
import journeyRecipe from './recipes/journey.md?raw';
import ganttRecipe from './recipes/gantt.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import quadrantRecipe from './recipes/quadrant.md?raw';
import requirementRecipe from './recipes/requirement.md?raw';
import gitRecipe from './recipes/git.md?raw';
import c4Recipe from './recipes/c4.md?raw';
import mindmapRecipe from './recipes/mindmap.md?raw';
import timelineRecipe from './recipes/timeline.md?raw';
import zenumlRecipe from './recipes/zenuml.md?raw';
import sankeyRecipe from './recipes/sankey.md?raw';
import xychartRecipe from './recipes/xychart.md?raw';
import blockRecipe from './recipes/block.md?raw';
import packetRecipe from './recipes/packet.md?raw';
import kanbanRecipe from './recipes/kanban.md?raw';
import architectureRecipe from './recipes/architecture.md?raw';

// Renderers
import { render as renderFlowchart } from './widgets/flowchart.js';
import { render as renderSequence } from './widgets/sequence.js';
import { render as renderClass } from './widgets/class.js';
import { render as renderState } from './widgets/state.js';
import { render as renderEr } from './widgets/er.js';
import { render as renderJourney } from './widgets/journey.js';
import { render as renderGantt } from './widgets/gantt.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderQuadrant } from './widgets/quadrant.js';
import { render as renderRequirement } from './widgets/requirement.js';
import { render as renderGit } from './widgets/git.js';
import { render as renderC4 } from './widgets/c4.js';
import { render as renderMindmap } from './widgets/mindmap.js';
import { render as renderTimeline } from './widgets/timeline.js';
import { render as renderZenuml } from './widgets/zenuml.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderXychart } from './widgets/xychart.js';
import { render as renderBlock } from './widgets/block.js';
import { render as renderPacket } from './widgets/packet.js';
import { render as renderKanban } from './widgets/kanban.js';
import { render as renderArchitecture } from './widgets/architecture.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const mermaidServer = createWebMcpServer('mermaid', {
  description:
    'Mermaid diagram widgets (flowchart, sequence, class, state, ER, journey, gantt, pie, quadrant, requirement, git, C4, mindmap, timeline, ZenUML, sankey, XY chart, block, packet, kanban, architecture)',
});

const widgets: Array<[string, unknown]> = [
  [flowchartRecipe, renderFlowchart],
  [sequenceRecipe, renderSequence],
  [classRecipe, renderClass],
  [stateRecipe, renderState],
  [erRecipe, renderEr],
  [journeyRecipe, renderJourney],
  [ganttRecipe, renderGantt],
  [pieRecipe, renderPie],
  [quadrantRecipe, renderQuadrant],
  [requirementRecipe, renderRequirement],
  [gitRecipe, renderGit],
  [c4Recipe, renderC4],
  [mindmapRecipe, renderMindmap],
  [timelineRecipe, renderTimeline],
  [zenumlRecipe, renderZenuml],
  [sankeyRecipe, renderSankey],
  [xychartRecipe, renderXychart],
  [blockRecipe, renderBlock],
  [packetRecipe, renderPacket],
  [kanbanRecipe, renderKanban],
  [architectureRecipe, renderArchitecture],
];

for (const [recipe, renderer] of widgets) {
  mermaidServer.registerWidget(recipe as string, renderer);
}

export { mermaidServer };
