import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/multi-react/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled', 'd3', 'plotly.js-dist-min', 'mermaid'],
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
