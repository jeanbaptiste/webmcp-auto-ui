import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/multi-vue/',
  plugins: [vue()],
  resolve: {
    dedupe: ['vue', 'd3', 'plotly.js-dist-min', 'mermaid'],
  },
  server: {
    port: 5180,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
