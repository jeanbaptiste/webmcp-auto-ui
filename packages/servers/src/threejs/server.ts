// @ts-nocheck
// ---------------------------------------------------------------------------
// Three.js visualization server — 24 widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import globeRecipe from './recipes/globe-3d.md?raw';
import barChart3dRecipe from './recipes/bar-chart-3d.md?raw';
import scatterPlot3dRecipe from './recipes/scatter-plot-3d.md?raw';
import surfacePlotRecipe from './recipes/surface-plot.md?raw';
import pointCloudRecipe from './recipes/point-cloud.md?raw';
import meshViewerRecipe from './recipes/mesh-viewer.md?raw';
import voxelGridRecipe from './recipes/voxel-grid.md?raw';
import terrainRecipe from './recipes/terrain.md?raw';
import forceGraph3dRecipe from './recipes/force-graph-3d.md?raw';
import pieChart3dRecipe from './recipes/pie-chart-3d.md?raw';
import orbitDiagramRecipe from './recipes/orbit-diagram.md?raw';
import moleculeViewerRecipe from './recipes/molecule-viewer.md?raw';
import wireframeViewerRecipe from './recipes/wireframe-viewer.md?raw';
import heatmap3dRecipe from './recipes/heatmap-3d.md?raw';
import lineChart3dRecipe from './recipes/line-chart-3d.md?raw';
import skyboxPanoramaRecipe from './recipes/skybox-panorama.md?raw';
import volumeCloudRecipe from './recipes/volume-cloud.md?raw';
import axesInspectorRecipe from './recipes/axes-inspector.md?raw';
import animatedMorphRecipe from './recipes/animated-morph.md?raw';
import particleSystemRecipe from './recipes/particle-system.md?raw';
import treeMap3dRecipe from './recipes/tree-map-3d.md?raw';
import ribbonChartRecipe from './recipes/ribbon-chart.md?raw';
import shadowSceneRecipe from './recipes/shadow-scene.md?raw';
import stlViewerRecipe from './recipes/stl-viewer.md?raw';

// Renderers
import { render as renderGlobe } from './widgets/globe-3d.js';
import { render as renderBarChart3d } from './widgets/bar-chart-3d.js';
import { render as renderScatterPlot3d } from './widgets/scatter-plot-3d.js';
import { render as renderSurfacePlot } from './widgets/surface-plot.js';
import { render as renderPointCloud } from './widgets/point-cloud.js';
import { render as renderMeshViewer } from './widgets/mesh-viewer.js';
import { render as renderVoxelGrid } from './widgets/voxel-grid.js';
import { render as renderTerrain } from './widgets/terrain.js';
import { render as renderForceGraph3d } from './widgets/force-graph-3d.js';
import { render as renderPieChart3d } from './widgets/pie-chart-3d.js';
import { render as renderOrbitDiagram } from './widgets/orbit-diagram.js';
import { render as renderMoleculeViewer } from './widgets/molecule-viewer.js';
import { render as renderWireframeViewer } from './widgets/wireframe-viewer.js';
import { render as renderHeatmap3d } from './widgets/heatmap-3d.js';
import { render as renderLineChart3d } from './widgets/line-chart-3d.js';
import { render as renderSkyboxPanorama } from './widgets/skybox-panorama.js';
import { render as renderVolumeCloud } from './widgets/volume-cloud.js';
import { render as renderAxesInspector } from './widgets/axes-inspector.js';
import { render as renderAnimatedMorph } from './widgets/animated-morph.js';
import { render as renderParticleSystem } from './widgets/particle-system.js';
import { render as renderTreeMap3d } from './widgets/tree-map-3d.js';
import { render as renderRibbonChart } from './widgets/ribbon-chart.js';
import { render as renderShadowScene } from './widgets/shadow-scene.js';
import { render as renderStlViewer } from './widgets/stl-viewer.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const threejsServer = createWebMcpServer('threejs', {
  description:
    '3D visualizations with Three.js (globe, terrain, scatter 3D, mesh viewer, bar chart 3D, particles, molecules, and more)',
});

const widgets: Array<[string, unknown]> = [
  [globeRecipe, renderGlobe],
  [barChart3dRecipe, renderBarChart3d],
  [scatterPlot3dRecipe, renderScatterPlot3d],
  [surfacePlotRecipe, renderSurfacePlot],
  [pointCloudRecipe, renderPointCloud],
  [meshViewerRecipe, renderMeshViewer],
  [voxelGridRecipe, renderVoxelGrid],
  [terrainRecipe, renderTerrain],
  [forceGraph3dRecipe, renderForceGraph3d],
  [pieChart3dRecipe, renderPieChart3d],
  [orbitDiagramRecipe, renderOrbitDiagram],
  [moleculeViewerRecipe, renderMoleculeViewer],
  [wireframeViewerRecipe, renderWireframeViewer],
  [heatmap3dRecipe, renderHeatmap3d],
  [lineChart3dRecipe, renderLineChart3d],
  [skyboxPanoramaRecipe, renderSkyboxPanorama],
  [volumeCloudRecipe, renderVolumeCloud],
  [axesInspectorRecipe, renderAxesInspector],
  [animatedMorphRecipe, renderAnimatedMorph],
  [particleSystemRecipe, renderParticleSystem],
  [treeMap3dRecipe, renderTreeMap3d],
  [ribbonChartRecipe, renderRibbonChart],
  [shadowSceneRecipe, renderShadowScene],
  [stlViewerRecipe, renderStlViewer],
];

for (const [recipe, renderer] of widgets) {
  threejsServer.registerWidget(recipe as string, renderer);
}

export { threejsServer };
