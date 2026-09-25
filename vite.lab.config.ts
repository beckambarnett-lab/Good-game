import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Builds a single Review Lab (LAB=<name>) into dist-lab/<name>/ with relative paths so it can be
// uploaded as a standalone page.
const lab = process.env.LAB ?? 'music';

export default defineConfig({
  root: resolve(import.meta.dirname, 'lab', lab),
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, 'dist-lab', lab),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
  worker: { format: 'es' },
  server: { fs: { allow: [import.meta.dirname] } },
});
