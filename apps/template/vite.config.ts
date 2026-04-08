import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      '@webmcp-auto-ui/sdk/canvas': path.resolve('../../packages/sdk/src/canvas.ts'),
    }
  },
});
