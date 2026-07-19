import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';

import { ImageService } from '../services/image-service';

const TEST_DIR = path.join(process.cwd(), '.naver-commerce-test');

describe('ImageService', () => {
  let service: ImageService;
  let samplePng: string;

  beforeAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });
    service = new ImageService({ outputDir: TEST_DIR });

    samplePng = path.join(TEST_DIR, 'sample.png');
    await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 100, g: 150, b: 200 } },
    })
      .png()
      .toFile(samplePng);
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('resize() reduces dimensions', async () => {
    const resized = await service.resize(samplePng, 200);
    const meta = await sharp(resized).metadata();
    expect(meta.width).toBeLessThanOrEqual(200);
  });

  it('webp() converts to WebP', async () => {
    const webpPath = await service.webp(samplePng);
    expect(webpPath).toMatch(/\.webp$/);
  });

  it('removeMetadata() creates clean copy', async () => {
    const cleaned = await service.removeMetadata(samplePng);
    expect(cleaned).toContain('-clean');
  });

  it('hash() returns consistent SHA-256', async () => {
    const h1 = await service.hash(samplePng);
    const h2 = await service.hash(samplePng);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('zip() bundles files', async () => {
    const webp = await service.webp(samplePng);
    const zipPath = await service.zip([webp], 'test-bundle.zip');
    expect(zipPath).toMatch(/test-bundle\.zip$/);
  });
});
