import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import path from 'path';

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_HASH__: JSON.stringify(process.env.GIT_HASH || execSync('git rev-parse --short=8 HEAD').toString().trim()),
  },
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      external: [
        'd3', 'three', 'three/addons/controls/OrbitControls.js',
        'mermaid', 'plotly.js-dist-min',
        'leaflet', 'leaflet.heat', 'leaflet.markercluster', 'leaflet-draw', 'leaflet-routing-machine', 'leaflet.glify',
        'mapbox-gl',
        'chart.js',
        'cytoscape', 'cytoscape-dagre', 'cytoscape-cola', 'cytoscape-cose-bilkent', 'cytoscape-fcose',
        'roughjs',
        'pixi.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@webmcp-auto-ui/sdk/canvas': path.resolve('../../packages/sdk/src/canvas.ts'),
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
});
