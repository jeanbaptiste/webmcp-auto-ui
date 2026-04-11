// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-threejs — WebMCP Server
// 3D visualizations powered by Three.js
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import globeRecipe from './recipes/globe.md?raw';
import terrainRecipe from './recipes/terrain.md?raw';
import scatter3dRecipe from './recipes/scatter3d.md?raw';
import meshViewerRecipe from './recipes/mesh-viewer.md?raw';
import bar3dRecipe from './recipes/bar3d.md?raw';

import { render as renderGlobe } from './widgets/globe.js';
import { render as renderTerrain } from './widgets/terrain.js';
import { render as renderScatter3d } from './widgets/scatter3d.js';
import { render as renderMeshViewer } from './widgets/mesh-viewer.js';
import { render as renderBar3d } from './widgets/bar3d.js';

export const threejsServer = createWebMcpServer('threejs', {
  description:
    '3D visualizations with Three.js (globe, terrain, scatter 3D, mesh viewer, bar chart 3D)',
});

threejsServer.registerWidget(globeRecipe, renderGlobe);
threejsServer.registerWidget(terrainRecipe, renderTerrain);
threejsServer.registerWidget(scatter3dRecipe, renderScatter3d);
threejsServer.registerWidget(meshViewerRecipe, renderMeshViewer);
threejsServer.registerWidget(bar3dRecipe, renderBar3d);
