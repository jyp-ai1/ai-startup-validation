import { describe, it, expect } from 'vitest';

import { createAutomationPlatform } from '../index';

describe('Naver Upload Pipeline', () => {
  it(
    'runs full demo pipeline end-to-end with real Playwright crawl',
    async () => {
      const platform = createAutomationPlatform();
      const result = await platform.runNaverPipeline('trace-naver-test');

      expect(result.pipelineId).toBe('naver-product-upload');
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(5);
      expect(result.results.every((r) => r.status === 'completed')).toBe(true);

      const crawl = result.results.find((r) => r.jobId === 'browser.crawl');
      expect(crawl?.output).toMatchObject({
        pages: 1,
        results: expect.arrayContaining([
          expect.objectContaining({
            title: 'Browser Platform Test Page',
            htmlLength: expect.any(Number),
          }),
        ]),
      });

      const upload = result.results.find((r) => r.jobId === 'naver.upload');
      expect(upload?.output).toMatchObject({
        status: 'draft',
        productId: expect.stringMatching(/^NAVER-/),
      });
    },
    120_000,
  );

  it('registers all demo jobs', () => {
    const platform = createAutomationPlatform();
    const ids = platform.jobs.listIds();
    expect(ids).toContain('filesystem.scan');
    expect(ids).toContain('browser.crawl');
    expect(ids).toContain('image.optimize');
    expect(ids).toContain('content.generate');
    expect(ids).toContain('naver.upload');
  });
});
