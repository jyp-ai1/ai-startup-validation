import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    environment: 'node',
    include: ['scripts/sprint2-conversation-continuity-final.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..'),
    },
  },
});
