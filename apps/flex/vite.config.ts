import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      '@webmcp-auto-ui/sdk/canvas':         path.resolve('../../packages/sdk/src/canvas.ts'),
      '@webmcp-auto-ui/agent/gemma-worker': path.resolve('../../packages/agent/src/providers/gemma.worker.ts'),
    }
  },
  ssr: {
    noExternal: ['gridstack'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
});
