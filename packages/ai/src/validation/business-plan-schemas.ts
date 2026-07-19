import { z } from 'zod';
import { BUSINESS_PLAN_SECTION_TYPES } from '@repo/types/validation';

export const aiBusinessPlanSectionSchema = z.object({
  type: z.enum(BUSINESS_PLAN_SECTION_TYPES),
  title: z.string().min(1),
  content: z.string(),
});

export const aiBusinessPlanOutputSchema = z.object({
  title: z.string().min(1),
  sections: z.array(aiBusinessPlanSectionSchema).min(1),
});

export type ParsedAIBusinessPlanOutput = z.infer<typeof aiBusinessPlanOutputSchema>;

export { parseAIJsonResponse } from './schemas';

export function validateAIBusinessPlanOutput(raw: unknown): ParsedAIBusinessPlanOutput {
  return aiBusinessPlanOutputSchema.parse(raw);
}
