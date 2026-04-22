import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [sveltekit()],
  worker: { format: 'es' },
  build: {
    // vega-embed is an optional peer dep of @webmcp-auto-ui/ui — chart-renderer
    // loads it lazily with a fallback. Mark it external so Rollup doesn't try
    // to bundle it at build time when it's not installed in the consumer app.
    rollupOptions: { external: ['vega-embed'] },
  },
  optimizeDeps: { exclude: ['vega-embed'] },
});
