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
      external: ['onnxruntime-web'],  // loaded from CDN at runtime (~70MB savings)
    },
  },
  resolve: {
    alias: {
      '@webmcp-auto-ui/sdk/canvas': path.resolve('../../packages/sdk/src/canvas.ts'),
    }
  },
  ssr: {
    noExternal: ['hyperskills', '@webmcp-auto-ui/core', '@webmcp-auto-ui/agent'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
});
