import { defineConfig } from 'vite';
import { execSync } from 'child_process';

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_HASH__: JSON.stringify(
      process.env.GIT_HASH ||
        execSync('git rev-parse --short=8 HEAD').toString().trim(),
    ),
  },
  server: {
    port: 5199,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
