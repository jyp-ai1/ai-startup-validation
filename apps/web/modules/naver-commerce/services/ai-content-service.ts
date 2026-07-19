import { ai } from '@/lib/ai/platform';

import { buildFallbackContent } from './ai-content-service-internal';
import type { AiProductContent, ExtractedProduct } from '../types';

export type AiContentOptions = {
  model?: string;
  fallback?: boolean;
};

const DEFAULT_MODEL = 'gpt-4o';

/** Generate Naver listing content via @repo/ai. */
export async function generateProductContent(
  product: ExtractedProduct,
  options: AiContentOptions = {},
): Promise<AiProductContent> {
  const model = options.model ?? DEFAULT_MODEL;

  try {
    const response = await ai.chat.generateJSON({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a Naver Smart Store product copywriter. Respond with JSON only: { title, summary, description, seoKeywords }.',
        },
        {
          role: 'user',
          content: buildPrompt(product),
        },
      ],
    });

    const raw = response.json as Partial<AiProductContent>;
    if (raw?.title) {
      return {
        title: raw.title,
        summary: raw.summary ?? '',
        description: raw.description ?? '',
        seoKeywords: Array.isArray(raw.seoKeywords) ? raw.seoKeywords : [],
      };
    }
  } catch {
    // fall through
  }

  if (options.fallback !== false) {
    return buildFallbackContent(product);
  }

  throw new Error('AI content generation failed');
}

function buildPrompt(product: ExtractedProduct): string {
  return [
    `Original title: ${product.title}`,
    `Brand: ${product.brand}`,
    `Category: ${product.category}`,
    `Price: ${product.price} ${product.currency}`,
    `Description: ${product.description}`,
    `Options: ${product.options.map((o) => `${o.name}: ${o.values.join(', ')}`).join('; ')}`,
    '',
    'Generate optimized Korean listing content for Naver Smart Store.',
  ].join('\n');
}

export { buildFallbackContent };
