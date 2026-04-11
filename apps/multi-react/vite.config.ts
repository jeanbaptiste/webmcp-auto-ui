import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled', 'd3', 'plotly.js-dist-min', 'mermaid'],
    alias: {
      // Force Vite to resolve widget transitive deps from multi-react's node_modules
      'd3': path.resolve(__dirname, 'node_modules/d3'),
      'plotly.js-dist-min': path.resolve(__dirname, 'node_modules/plotly.js-dist-min'),
      'mermaid': path.resolve(__dirname, 'node_modules/mermaid'),
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
    },
  },
  server: {
    port: 5182,
    proxy: {
      '/api/chat': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: () => '/v1/messages',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const apiKey = parsed.__apiKey || '';
                delete parsed.__apiKey;
                proxyReq.setHeader('x-api-key', apiKey);
                proxyReq.setHeader('anthropic-version', '2023-06-01');
                proxyReq.setHeader('anthropic-beta', 'prompt-caching-2024-07-31');
                proxyReq.setHeader('content-type', 'application/json');
                const rewritten = JSON.stringify(parsed);
                proxyReq.setHeader('content-length', Buffer.byteLength(rewritten));
                proxyReq.write(rewritten);
                proxyReq.end();
              } catch {
                proxyReq.end();
              }
            });
          });
        },
      },
    },
  },
});
