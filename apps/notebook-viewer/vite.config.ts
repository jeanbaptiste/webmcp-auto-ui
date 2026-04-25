import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Heavy libraries that should NOT be bundled with the notebook-viewer.
// They are either:
//   - optional peer deps loaded lazily by widget renderers (vega-embed)
//   - dynamic-imported from inside @webmcp-auto-ui/agent (onnxruntime-web,
//     @huggingface/transformers) for paths the viewer never exercises
//     (nano-rag embedder, transformers worker)
//   - markdown / syntax-highlighting libs that ship as huge chunks but are
//     better served from a CDN via the import map declared in app.html
//
// Marking them external tells Rollup/Vite to keep the bare specifier in the
// generated bundle. The browser then resolves it through the import map
// (esm.sh) at runtime — saving ~46 MB of WASM and ~1 MB of JS.
const EXTERNALS = [
  'vega-embed',
  'onnxruntime-web',
  '@huggingface/transformers',
  'marked',
  'highlight.js',
  'html-to-image',
];

export default defineConfig({
  plugins: [sveltekit()],
  worker: {
    format: 'es',
    rollupOptions: { external: EXTERNALS },
  },
  build: {
    sourcemap: false,
    rollupOptions: { external: EXTERNALS },
  },
  ssr: { external: EXTERNALS, noExternal: [] },
  optimizeDeps: { exclude: EXTERNALS },
});
