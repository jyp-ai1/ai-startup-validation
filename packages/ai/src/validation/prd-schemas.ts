import { z } from 'zod';
import { PRD_SECTION_TYPES } from '@repo/types/validation';

export const aiPRDSectionSchema = z.object({
  type: z.enum(PRD_SECTION_TYPES),
  title: z.string().min(1),
  content: z.string(),
});

export const aiPRDOutputSchema = z.object({
  title: z.string().min(1),
  sections: z.array(aiPRDSectionSchema).min(1),
});

export type ParsedAIPRDOutput = z.infer<typeof aiPRDOutputSchema>;

export { parseAIJsonResponse } from './schemas';

export function validateAIPRDOutput(raw: unknown): ParsedAIPRDOutput {
  return aiPRDOutputSchema.parse(raw);
}
