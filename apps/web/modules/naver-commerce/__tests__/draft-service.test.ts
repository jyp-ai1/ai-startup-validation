import { describe, it, expect } from 'vitest';

import { buildFallbackContent } from '../services/ai-content-service-internal';
import { createProductDraft } from '../services/draft-service';
import type { ExtractedProduct } from '../types';

const mockProduct: ExtractedProduct = {
  sourceUrl: 'https://example.com/product/1',
  title: '테스트 이어폰',
  price: 89000,
  currency: 'KRW',
  brand: 'SoundMax',
  category: '전자기기/이어폰',
  description: '노이즈 캔슬링 이어폰',
  images: ['/tmp/image.webp'],
  options: [{ name: '색상', values: ['블랙', '화이트'] }],
  shipping: { method: '택배', fee: 3000, estimatedDays: '1-2일' },
  rawHtmlLength: 5000,
};

describe('createProductDraft', () => {
  it('creates Naver-compatible draft JSON', () => {
    const aiContent = buildFallbackContent(mockProduct);
    const draft = createProductDraft({
      traceId: 'trace-test',
      product: mockProduct,
      aiContent,
      images: {
        original: ['/tmp/resized.png'],
        webp: ['/tmp/image.webp'],
        thumbnail: '/tmp/thumb.webp',
        zipPath: '/tmp/product-images.zip',
      },
    });

    expect(draft.version).toBe('1.0');
    expect(draft.status).toBe('draft');
    expect(draft.id).toMatch(/^DRAFT-/);
    expect(draft.product.title).toContain('SoundMax');
    expect(draft.product.seoKeywords.length).toBeGreaterThan(0);
    expect(draft.images.optimized).toHaveLength(1);
    expect(draft.metadata.traceId).toBe('trace-test');
  });
});

describe('buildFallbackContent', () => {
  it('generates Korean listing content without AI', () => {
    const content = buildFallbackContent(mockProduct);
    expect(content.title).toContain('SoundMax');
    expect(content.description).toContain('노이즈 캔슬링');
    expect(content.seoKeywords).toContain('네이버스마트스토어');
  });
});
