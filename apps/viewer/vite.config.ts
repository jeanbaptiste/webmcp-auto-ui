import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

// ---------------------------------------------------------------------------
// Heavy widget libraries — externalised so Vite leaves `await import('xxx')`
// untouched. The browser resolves them via the ESM import map in app.html
// (esm.sh CDN). Drastically reduces client bundle size (cesium ~6MB,
// perspective/plotly several MB each, etc.).
//
// IMPORTANT: only libs that the widget code accesses via *dynamic* import are
// safe to externalise. Static `import 'foo'` from the entry graph would break
// since esm.sh URLs aren't valid bare specifiers in Node SSR.
// ---------------------------------------------------------------------------
const HEAVY_EXTERNALS = [
  // existing
  'onnxruntime-web',
  '@huggingface/transformers',
  '@here/harp-features-datasource',
  // 3D / globes
  'cesium',
  'three',
  // dataviz heavy
  'plotly.js-dist-min',
  'plotly.js',
  '@finos/perspective',
  '@finos/perspective-viewer',
  '@finos/perspective-viewer-datagrid',
  '@finos/perspective-viewer-d3fc',
  // Deep-paths used by packages/servers/src/perspective/widgets/shared.ts.
  // The bare-specifier external above does NOT match these — Rollup needs the
  // exact request string. Without these entries the inline.js variants get
  // bundled (~7 MB of base64-embedded wasm). See app.html importmap (jsdelivr).
  '@finos/perspective/dist/esm/perspective.inline.js',
  '@finos/perspective-viewer/dist/esm/perspective-viewer.inline.js',
  // deck.gl monorepo
  'deck.gl',
  '@deck.gl/core',
  '@deck.gl/layers',
  '@deck.gl/geo-layers',
  '@deck.gl/aggregation-layers',
  '@deck.gl/mesh-layers',
  // maps
  'maplibre-gl',
  'mapbox-gl',
  'ol',
  'leaflet',
  'pmtiles',
  // charts
  'echarts',
  'vega',
  'vega-lite',
  'vega-embed',
  'mermaid',
  'ag-charts-community',
  // graphs
  '@antv/g6',
  'sigma',
  'cytoscape',
  // misc
  'pixi.js',
  's2js',
];

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_HASH__: JSON.stringify(process.env.GIT_HASH || execSync('git rev-parse --short=8 HEAD').toString().trim()),
    __APP_VERSION__: JSON.stringify(JSON.parse(execSync('cat ./package.json').toString()).version),
  },
  plugins: [sveltekit()],
  worker: {
    format: 'es',
    rollupOptions: {
      external: HEAVY_EXTERNALS,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      external: HEAVY_EXTERNALS,
    },
  },
  optimizeDeps: {
    esbuildOptions: { target: 'es2022' },
    exclude: HEAVY_EXTERNALS,
  },
  ssr: {
    external: HEAVY_EXTERNALS,
  },
});
