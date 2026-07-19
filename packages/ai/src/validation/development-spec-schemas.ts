import { z } from 'zod';
import { DEVELOPMENT_SPEC_SECTION_TYPES } from '@repo/types/validation';

export const aiDevelopmentSpecSectionSchema = z.object({
  type: z.enum(DEVELOPMENT_SPEC_SECTION_TYPES),
  title: z.string().min(1),
  content: z.string(),
});

export const aiDevelopmentSpecOutputSchema = z.object({
  title: z.string().min(1),
  sections: z.array(aiDevelopmentSpecSectionSchema).min(1),
});

export type ParsedAIDevelopmentSpecOutput = z.infer<typeof aiDevelopmentSpecOutputSchema>;

export { parseAIJsonResponse } from './schemas';

export function validateAIDevelopmentSpecOutput(raw: unknown): ParsedAIDevelopmentSpecOutput {
  return aiDevelopmentSpecOutputSchema.parse(raw);
}
