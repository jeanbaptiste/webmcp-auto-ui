import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    optimizeDeps: {
      exclude: [
        '@webmcp-auto-ui/core',
        '@webmcp-auto-ui/agent',
        '@webmcp-auto-ui/sdk',
        '@webmcp-auto-ui/widgets-vanilla',
        '@webmcp-auto-ui/widgets-d3',
        '@webmcp-auto-ui/widgets-canvas2d',
        '@webmcp-auto-ui/widgets-mermaid',
        '@webmcp-auto-ui/widgets-plotly',
      ],
    },
  },
});
