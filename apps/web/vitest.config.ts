import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'modules/**/__tests__/**/*.test.ts',
      'features/**/first-trust/__tests__/**/*.test.ts',
      'features/**/business-understanding/**/__tests__/**/*.test.ts',
      'lib/analysis-engine/**/__tests__/**/*.test.ts',
    ],
    testTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
