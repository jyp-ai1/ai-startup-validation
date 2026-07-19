import { describe, it, expect } from 'vitest';

import { runProductPipeline } from '../services/pipeline-service';

describe('runProductPipeline', () => {
  it(
    'runs full import pipeline with local test fixture',
    async () => {
      const result = await runProductPipeline({
        url: 'test',
        skipAi: true,
      });

      expect(result.success).toBe(true);
      expect(result.steps.every((s) => s.status === 'completed' || s.status === 'skipped')).toBe(
        true,
      );

      expect(result.extracted?.title).toBeTruthy();
      expect(result.extracted?.price).toBeGreaterThan(0);
      expect(result.extracted?.options.length).toBeGreaterThan(0);

      expect(result.aiContent?.title).toBeTruthy();
      expect(result.draft?.id).toMatch(/^DRAFT-/);
      expect(result.draft?.product.title).toBeTruthy();
      expect(result.logs.length).toBeGreaterThan(0);
    },
    120_000,
  );
});
