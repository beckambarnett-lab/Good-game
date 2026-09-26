import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Relative base so builds work from GitHub Pages subpaths and from Lab artifact uploads alike.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
  worker: { format: 'es' },
  server: { host: true },
});
