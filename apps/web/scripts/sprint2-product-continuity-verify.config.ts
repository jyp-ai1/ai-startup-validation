import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['scripts/sprint2-product-continuity-verify.test.ts'],
    fileParallelism: false,
    testTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..'),
    },
  },
});
