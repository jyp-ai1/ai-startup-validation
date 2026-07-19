import type { AiProductContent, ExtractedProduct } from '../types';

/** Internal fallback builder — shared with pipeline when AI skipped. */
export function buildFallbackContent(product: ExtractedProduct): AiProductContent {
  const title = `[${product.brand}] ${product.title}`.slice(0, 100);
  const summary = `${product.description || product.title}`.slice(0, 200);
  const description = [
    `## ${product.title}`,
    '',
    product.description || '프리미엄 상품입니다.',
    '',
    `브랜드: ${product.brand}`,
    `카테고리: ${product.category}`,
    product.options.length
      ? `\n옵션:\n${product.options.map((o) => `- ${o.name}: ${o.values.join(', ')}`).join('\n')}`
      : '',
    '',
    `배송: ${product.shipping.method} (${product.shipping.estimatedDays})`,
  ].join('\n');

  const seoKeywords = [
    product.brand,
    product.category,
    ...product.title.split(/\s+/).slice(0, 5),
    '네이버스마트스토어',
  ].filter(Boolean);

  return { title, summary, description, seoKeywords: [...new Set(seoKeywords)] };
}
