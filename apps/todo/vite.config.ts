import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';
export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_HASH__: JSON.stringify(process.env.GIT_HASH || execSync('git rev-parse --short=8 HEAD').toString().trim()),
    __APP_VERSION__: JSON.stringify(JSON.parse(execSync('cat ./package.json').toString()).version),
  },
  plugins: [sveltekit()],
  build: { sourcemap: false },
  worker: { format: 'es' },
});
