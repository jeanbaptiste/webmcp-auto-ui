import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

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
      external: ['onnxruntime-web', '@huggingface/transformers'],
    },
  },
  build: {
    target: 'es2022',  // top-level await needed by perspective-viewer-d3fc and others
    sourcemap: false,
    rollupOptions: {
      external: [
        'onnxruntime-web',
        '@huggingface/transformers',  // loaded from CDN at runtime (~70MB savings)
        '@here/harp-features-datasource',  // optional Harp peer not installed; widget try/catches at runtime
      ],
    },
  },
  optimizeDeps: {
    esbuildOptions: { target: 'es2022' },
    // Skip pre-bundling for the inline perspective variants — they embed a
    // ~3 MB base64 wasm blob and a top-level-await init_client/init_server
    // call. esbuild's pre-bundle chokes on both; serving them as native ESM
    // modules works fine.
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
    external: ['@huggingface/transformers', 'onnxruntime-web'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
});
