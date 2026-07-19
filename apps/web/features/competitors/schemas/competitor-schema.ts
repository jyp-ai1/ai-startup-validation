import { z } from '@repo/core/validation';
import {
  COMPETITOR_CATEGORIES,
  COMPETITOR_MARKET_POSITIONS,
} from '@repo/types/validation';

export const createCompetitorSchema = z.object({
  name: z.string().trim().min(1, 'Company Name을 입력해주세요'),
  category: z.enum(COMPETITOR_CATEGORIES, {
    errorMap: () => ({ message: 'Category를 선택해주세요' }),
  }),
  description: z.string().trim().nullable().optional(),
  website: z.string().url().nullable().optional(),
  targetCustomer: z.string().trim().nullable().optional(),
  businessModel: z.string().trim().nullable().optional(),
  pricing: z.string().trim().nullable().optional(),
  strengths: z.string().trim().nullable().optional(),
  weaknesses: z.string().trim().nullable().optional(),
  differentiation: z.string().trim().nullable().optional(),
  marketPosition: z.enum(COMPETITOR_MARKET_POSITIONS).nullable().optional(),
});

export const updateCompetitorSchema = createCompetitorSchema.partial();

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export const COMPETITOR_CATEGORY_LABELS: Record<
  (typeof COMPETITOR_CATEGORIES)[number],
  string
> = {
  DIRECT: 'Direct',
  INDIRECT: 'Indirect',
  SUBSTITUTE: 'Substitute',
};

export const COMPETITOR_CATEGORY_DESCRIPTIONS: Record<
  (typeof COMPETITOR_CATEGORIES)[number],
  string
> = {
  DIRECT: '동일 고객 문제를 해결하는 서비스',
  INDIRECT: '다른 방식으로 문제를 해결하는 서비스',
  SUBSTITUTE: '대체 가능한 기존 방식',
};

export const COMPETITOR_MARKET_POSITION_LABELS: Record<
  (typeof COMPETITOR_MARKET_POSITIONS)[number],
  string
> = {
  LEADER: 'Leader',
  CHALLENGER: 'Challenger',
  FOLLOWER: 'Follower',
  NEWCOMER: 'Newcomer',
};

export const COMPARISON_FIELD_LABELS: Record<
  'businessModel' | 'targetCustomer' | 'pricing' | 'strengths' | 'weaknesses' | 'differentiation',
  string
> = {
  businessModel: 'Business Model',
  targetCustomer: 'Target Customer',
  pricing: 'Pricing',
  strengths: 'Strength',
  weaknesses: 'Weakness',
  differentiation: 'Differentiation',
};

export const COMPARISON_FIELDS = [
  'businessModel',
  'targetCustomer',
  'pricing',
  'strengths',
  'weaknesses',
  'differentiation',
] as const;
