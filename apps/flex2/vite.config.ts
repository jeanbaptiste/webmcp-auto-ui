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
  resolve: {
    alias: {
      '@webmcp-auto-ui/sdk/canvas': path.resolve('../../packages/sdk/src/canvas.ts'),
    }
  },
  ssr: {
    noExternal: ['hyperskills'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
});
