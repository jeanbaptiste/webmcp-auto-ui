import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import path from 'path';

// Heavy WebMCP server libs are externalized via the importmap in app.html, so
// vite/esbuild don't try to bundle them (cesium, three, deck.gl, etc.).
const HEAVY_LIBS = [
  'onnxruntime-web',
  '@huggingface/transformers',
  'cesium',
  'maplibre-gl',
  'mapbox-gl',
  'leaflet',
  'pmtiles',
  's2js',
  'plotly.js-dist-min',
  'mermaid',
  'vega-embed',
  '@antv/g6',
  'three',
  /^three\/.*/,
  'pixi.js',
  '@finos/perspective/dist/esm/perspective.inline.js',
  '@finos/perspective-viewer/dist/esm/perspective-viewer.inline.js',
  'deck.gl',
  '@deck.gl/core',
  '@deck.gl/layers',
  '@deck.gl/aggregation-layers',
  '@deck.gl/geo-layers',
  '@deck.gl/mapbox',
  '@deck.gl/mesh-layers',
  '@luma.gl/engine',
];

const SHOWCASE_EXTERNALS = [
  'marked',
  'highlight.js',
  'html-to-image',
  'turndown',
];

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_HASH__: JSON.stringify(process.env.GIT_HASH || execSync('git rev-parse --short=8 HEAD').toString().trim()),
    __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('./package.json', 'utf8')).version),
  },
  plugins: [sveltekit()],
  worker: {
    format: 'es',
    rollupOptions: {
      external: [...HEAVY_LIBS, ...SHOWCASE_EXTERNALS],
    },
  },
  build: {
    target: 'es2022', // top-level await needed by perspective-viewer-d3fc and others
    rollupOptions: {
      external: [...HEAVY_LIBS, ...SHOWCASE_EXTERNALS],
    },
  },
  optimizeDeps: {
    esbuildOptions: { target: 'es2022' },
    exclude: [
      '@finos/perspective',
      '@finos/perspective-viewer',
      '@finos/perspective-viewer-datagrid',
      '@finos/perspective-viewer-d3fc',
    ],
  },
  resolve: {
    alias: {
      '@webmcp-auto-ui/sdk/canvas': path.resolve('../../packages/sdk/src/canvas.ts'),
    }
  },
  ssr: {
    noExternal: ['hyperskills', '@webmcp-auto-ui/core', '@webmcp-auto-ui/agent'],
    external: [...HEAVY_LIBS, ...SHOWCASE_EXTERNALS],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
});
