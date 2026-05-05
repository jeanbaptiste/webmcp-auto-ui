import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Heavy libraries that should NOT be bundled with notebook-viewer.
// Mirrors apps/flex/vite.config.ts so when the viewer pulls in
// @webmcp-auto-ui/servers (~30 viz servers), none of their underlying
// libs (three, cesium, vega-embed, deck.gl, plotly, …) end up in the
// bundle. They are loaded by the browser via the importmap in app.html
// (esm.sh / jsDelivr) only when a widget actually needs them.
const EXTERNALS = [
  // Always-external (legacy)
  'vega-embed',
  'onnxruntime-web',
  '@huggingface/transformers',
  'marked',
  'highlight.js',
  'html-to-image',
  '@here/harp-features-datasource',
  // Geo / mapping
  'cesium',
  'maplibre-gl',
  'mapbox-gl',
  'leaflet',
  'pmtiles',
  's2js',
  '@here/harp-mapview',
  '@here/harp-datasource-protocol',
  '@here/harp-map-controls',
  '@here/harp-omv-datasource',
  // Charting / viz
  'plotly.js-dist-min',
  'mermaid',
  '@antv/g6',
  // 3D / graphics
  'three',
  /^three\/.*/,
  'pixi.js',
  // Perspective inline bundles
  '@finos/perspective/dist/esm/perspective.inline.js',
  '@finos/perspective-viewer/dist/esm/perspective-viewer.inline.js',
  // deck.gl family
  'deck.gl',
  '@deck.gl/core',
  '@deck.gl/layers',
  '@deck.gl/aggregation-layers',
  '@deck.gl/geo-layers',
  '@deck.gl/mapbox',
  '@deck.gl/mesh-layers',
  '@luma.gl/engine',
];

export default defineConfig({
  plugins: [sveltekit()],
  worker: {
    format: 'es',
    rollupOptions: { external: EXTERNALS },
  },
  build: {
    target: 'es2022',  // top-level await needed by perspective-viewer-d3fc and others
    sourcemap: false,
    rollupOptions: { external: EXTERNALS },
  },
  ssr: { external: EXTERNALS, noExternal: [] },
  optimizeDeps: {
    esbuildOptions: { target: 'es2022' },
    exclude: EXTERNALS,
  },
});
