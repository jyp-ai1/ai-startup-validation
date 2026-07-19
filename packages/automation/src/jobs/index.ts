import { z } from 'zod';

import type { JobDefinition } from '../types';
import { jobRegistry } from './runner';

const scanOutput = z.object({
  files: z.array(z.string()),
  count: z.number(),
  root: z.string(),
});

const crawlOutput = z.object({
  urls: z.array(z.string()),
  pages: z.number(),
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      htmlLength: z.number(),
      html: z.string().optional(),
      screenshotPath: z.string().optional(),
      downloads: z.array(z.string()),
      loadTimeMs: z.number(),
      domReadyMs: z.number(),
    }),
  ),
});

const imageOutput = z.object({
  optimized: z.array(z.string()),
  savedBytes: z.number(),
});

const contentOutput = z.object({
  title: z.string(),
  body: z.string(),
  keywords: z.array(z.string()),
});

const uploadOutput = z.object({
  productId: z.string(),
  status: z.enum(['draft', 'published']),
  url: z.string().optional(),
});

/** Demo job: filesystem.scan */
export const filesystemScanJob: JobDefinition = {
  id: 'filesystem.scan',
  name: 'Filesystem Scan',
  version: '1.0.0',
  description: 'Scan directory for files to process',
  inputSchema: z.object({ root: z.string().default('/data/products') }),
  outputSchema: scanOutput,
  timeout: 30_000,
  retryable: true,
  maxRetries: 2,
  tags: ['filesystem', 'demo', 'naver-pipeline'],
  handler: async (input) => {
    const { root } = input as { root: string };
    return {
      root,
      files: [`${root}/product-001.json`, `${root}/product-002.json`],
      count: 2,
    };
  },
};

/** Demo job: browser.crawl — real Playwright via @repo/browser */
export const browserCrawlJob: JobDefinition = {
  id: 'browser.crawl',
  name: 'Browser Crawl',
  version: '2.0.0',
  description: 'Crawl pages with Playwright — HTML, screenshot, image download',
  inputSchema: z.object({
    files: z.array(z.string()).optional(),
    urls: z.array(z.string()).optional(),
    screenshotDir: z.string().optional(),
    downloadDir: z.string().optional(),
    includeHtml: z.boolean().optional(),
  }),
  outputSchema: crawlOutput,
  timeout: 180_000,
  retryable: true,
  maxRetries: 2,
  tags: ['browser', 'playwright', 'naver-pipeline'],
  handler: async (input, ctx) => {
    const data = input as {
      files?: string[];
      urls?: string[];
      screenshotDir?: string;
      downloadDir?: string;
      includeHtml?: boolean;
    };
    const { crawlPages } = await import('@repo/browser');
    const result = await crawlPages({
      files: data.files,
      urls: data.urls,
      screenshotDir: data.screenshotDir,
      downloadDir: data.downloadDir,
    });
    return {
      urls: result.urls,
      pages: result.pages,
      results: result.results.map((r) => ({
        url: r.url,
        title: r.title,
        htmlLength: r.htmlLength,
        ...(data.includeHtml ? { html: r.html } : {}),
        screenshotPath: r.screenshotPath,
        downloads: r.downloads,
        loadTimeMs: r.loadTimeMs,
        domReadyMs: r.domReadyMs,
      })),
      _traceId: ctx.traceId,
    };
  },
};

/** Demo job: image.optimize */
export const imageOptimizeJob: JobDefinition = {
  id: 'image.optimize',
  name: 'Image Optimize',
  version: '1.0.0',
  description: 'Optimize product images (stub — real pipeline in Sprint 9)',
  inputSchema: z.object({
    urls: z.array(z.string()).optional(),
    results: z
      .array(z.object({ downloads: z.array(z.string()).optional(), url: z.string().optional() }))
      .optional(),
  }),
  outputSchema: imageOutput,
  timeout: 60_000,
  retryable: true,
  maxRetries: 2,
  tags: ['image', 'demo', 'naver-pipeline'],
  handler: async (input) => {
    const data = input as {
      urls?: string[];
      results?: Array<{ downloads?: string[]; url?: string }>;
    };
    const paths =
      data.results?.flatMap((r) => r.downloads ?? (r.url ? [r.url] : [])) ??
      data.urls ??
      [];
    return {
      optimized: paths.map((p) => `${p}.optimized`),
      savedBytes: paths.length * 50_000,
    };
  },
};

/** Demo job: content.generate */
export const contentGenerateJob: JobDefinition = {
  id: 'content.generate',
  name: 'Content Generate',
  version: '1.0.0',
  description: 'Generate product content via AI (stub — @repo/ai in production)',
  inputSchema: z.object({
    urls: z.array(z.string()).optional(),
    optimized: z.array(z.string()).optional(),
  }),
  outputSchema: contentOutput,
  timeout: 90_000,
  retryable: true,
  maxRetries: 2,
  tags: ['content', 'ai', 'demo', 'naver-pipeline'],
  handler: async (input) => {
    const items = (input as { optimized?: string[] }).optimized ?? [];
    return {
      title: 'Premium Product Listing',
      body: `AI-generated description for ${items.length} product(s).`,
      keywords: ['naver', 'smartstore', 'automated'],
    };
  },
};

/** Demo job: naver.upload */
export const naverUploadJob: JobDefinition = {
  id: 'naver.upload',
  name: 'Naver Upload',
  version: '1.0.0',
  description: 'Upload product to Naver Smart Store (stub — real impl Sprint 11)',
  inputSchema: z.object({
    title: z.string(),
    body: z.string(),
    keywords: z.array(z.string()).optional(),
    optimized: z.array(z.string()).optional(),
  }),
  outputSchema: uploadOutput,
  timeout: 120_000,
  retryable: true,
  maxRetries: 3,
  tags: ['naver', 'commerce', 'demo', 'naver-pipeline'],
  handler: async (input) => {
    const { title } = input as { title: string };
    const productId = `NAVER-${crypto.randomUUID().slice(0, 8)}`;
    return {
      productId,
      status: 'draft' as const,
      url: `https://smartstore.naver.com/products/${productId}`,
      _title: title,
    };
  },
};

export const DEMO_JOBS = [
  filesystemScanJob,
  browserCrawlJob,
  imageOptimizeJob,
  contentGenerateJob,
  naverUploadJob,
];

/** Naver pipeline: scan → crawl → optimize → generate → upload */
export const NAVER_PIPELINE_ID = 'naver-product-upload';

export function registerDemoJobs(registry = jobRegistry): void {
  for (const job of DEMO_JOBS) {
    registry.register(job);
  }
}

export { jobRegistry, JobRegistry, JobRunner } from './runner';
export type { JobRunnerOptions } from './runner';
