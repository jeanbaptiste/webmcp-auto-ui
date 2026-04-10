import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
export default defineConfig({
  define: { '__BUILD_TIME__': JSON.stringify(new Date().toISOString()) },
  plugins: [sveltekit()],
});
