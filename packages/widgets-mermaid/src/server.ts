// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-mermaid — WebMCP Server
// Diagram visualizations powered by Mermaid.js
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import flowchartRecipe from './recipes/flowchart.md?raw';
import sequenceRecipe from './recipes/sequence.md?raw';
import ganttRecipe from './recipes/gantt.md?raw';
import erDiagramRecipe from './recipes/er-diagram.md?raw';
import classDiagramRecipe from './recipes/class-diagram.md?raw';
import mindmapRecipe from './recipes/mindmap.md?raw';
import pieChartRecipe from './recipes/pie-chart.md?raw';

import { render as renderFlowchart } from './widgets/flowchart.js';
import { render as renderSequence } from './widgets/sequence.js';
import { render as renderGantt } from './widgets/gantt.js';
import { render as renderErDiagram } from './widgets/er-diagram.js';
import { render as renderClassDiagram } from './widgets/class-diagram.js';
import { render as renderMindmap } from './widgets/mindmap.js';
import { render as renderPieChart } from './widgets/pie-chart.js';

export const mermaidServer = createWebMcpServer('mermaid', {
  description:
    'Diagram visualizations with Mermaid.js (flowcharts, sequence, Gantt, ER, class, mindmap, pie)',
});

mermaidServer.registerWidget(flowchartRecipe, renderFlowchart);
mermaidServer.registerWidget(sequenceRecipe, renderSequence);
mermaidServer.registerWidget(ganttRecipe, renderGantt);
mermaidServer.registerWidget(erDiagramRecipe, renderErDiagram);
mermaidServer.registerWidget(classDiagramRecipe, renderClassDiagram);
mermaidServer.registerWidget(mindmapRecipe, renderMindmap);
mermaidServer.registerWidget(pieChartRecipe, renderPieChart);
