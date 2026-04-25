import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

// Heavy libs externalized — resolved at runtime via the ESM import map in app.html
// (CDN: esm.sh). Keeps the boilerplate bundle minimal.
const EXTERNALS = [
  '@huggingface/transformers',
  'onnxruntime-web',
  'vega',
  'vega-lite',
  'vega-embed',
];

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_HASH__: JSON.stringify(process.env.GIT_HASH || execSync('git rev-parse --short=8 HEAD').toString().trim()),
  },
  plugins: [sveltekit()],
  worker: {
    format: 'es',
    rollupOptions: {
      external: EXTERNALS,
    },
  },
  build: {
    rollupOptions: {
      external: EXTERNALS,
    },
  },
  ssr: {
    external: EXTERNALS,
  },
});
