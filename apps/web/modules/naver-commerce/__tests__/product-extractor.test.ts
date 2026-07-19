import { describe, it, expect } from 'vitest';

import { extractProductFromHtml } from '../services/product-extractor';

const FIXTURE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="테스트 상품" />
  <meta property="og:description" content="테스트 설명" />
</head>
<body>
  <h1 data-product-title="테스트 상품">Title</h1>
  <div data-brand="TestBrand">TestBrand</div>
  <div data-category="카테고리/서브">카테고리/서브</div>
  <div data-price="45000" data-currency="KRW">45,000원</div>
  <p data-description="상품 상세 설명입니다.">desc</p>
  <img id="product-image" src="image.png" />
  <div data-option-group="색상">
    <span data-option-value="Red">Red</span>
    <span data-option-value="Blue">Blue</span>
  </div>
  <span data-shipping-method="택배" data-shipping-fee="2500" data-shipping-days="2-3일"></span>
</body>
</html>
`;

describe('extractProductFromHtml', () => {
  it('extracts structured product fields', () => {
    const product = extractProductFromHtml(FIXTURE_HTML, 'https://example.com/product/1');

    expect(product.title).toBe('테스트 상품');
    expect(product.brand).toBe('TestBrand');
    expect(product.category).toBe('카테고리/서브');
    expect(product.price).toBe(45000);
    expect(product.currency).toBe('KRW');
    expect(product.description).toBe('상품 상세 설명입니다.');
    expect(product.options).toHaveLength(1);
    expect(product.options[0]?.values).toEqual(['Red', 'Blue']);
    expect(product.shipping.method).toBe('택배');
    expect(product.shipping.fee).toBe(2500);
  });

  it('includes downloaded image paths', () => {
    const product = extractProductFromHtml(FIXTURE_HTML, 'https://example.com', {
      downloads: ['/tmp/image.webp'],
    });
    expect(product.images).toContain('/tmp/image.webp');
  });
});

describe('validateProductUrl', () => {
  it('validates http URLs', async () => {
    const { validateProductUrl } = await import('../utils/url-validator');
    const result = validateProductUrl('https://shop.example.com/item/123');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid URLs', async () => {
    const { validateProductUrl } = await import('../utils/url-validator');
    const result = validateProductUrl('not-a-url');
    expect(result.valid).toBe(false);
  });
});
