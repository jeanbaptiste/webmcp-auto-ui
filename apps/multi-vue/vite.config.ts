import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Ensure deps imported by file:-linked packages resolve from this app's node_modules
    dedupe: ['d3', 'plotly.js-dist-min', 'mermaid'],
    alias: {
      // Force Vite to resolve widget transitive deps from multi-vue's node_modules
      'd3': path.resolve(__dirname, 'node_modules/d3'),
      'plotly.js-dist-min': path.resolve(__dirname, 'node_modules/plotly.js-dist-min'),
      'mermaid': path.resolve(__dirname, 'node_modules/mermaid'),
    },
  },
  server: {
    port: 5180,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
