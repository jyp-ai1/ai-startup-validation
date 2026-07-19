import type { DevelopmentSpecContext } from '@repo/types/validation';
import { DEVELOPMENT_SPEC_SECTION_TYPES } from '@repo/types/validation';

import { renderDevelopmentSpecPrompt } from '../prompts/development-spec';
import { generateJSON, isAIConfigured } from './ai-client';
import { buildDevelopmentSpecContextText } from './development-spec-context-builder';
import {
  parseAIJsonResponse,
  validateAIDevelopmentSpecOutput,
  type ParsedAIDevelopmentSpecOutput,
} from './development-spec-schemas';

export type GenerateDevelopmentSpecResult = {
  output: ParsedAIDevelopmentSpecOutput;
  provider: string;
  model: string;
  usedMock: boolean;
};

const SECTION_TITLES: Record<(typeof DEVELOPMENT_SPEC_SECTION_TYPES)[number], string> = {
  SYSTEM_OVERVIEW: 'System Overview',
  TECH_STACK: 'Tech Stack',
  ARCHITECTURE: 'Architecture',
  DATABASE_SCHEMA: 'Database Schema',
  API_SPECIFICATION: 'API Specification',
  FRONTEND_STRUCTURE: 'Frontend Structure',
  BACKEND_STRUCTURE: 'Backend Structure',
  AUTH_DESIGN: 'Auth Design',
  SECURITY: 'Security',
  DEPLOYMENT: 'Deployment',
  TEST_PLAN: 'Test Plan',
  SPRINT_PLAN: 'Sprint Plan',
  DEVELOPMENT_GUIDE: 'Development Guide',
};

function buildMockDevelopmentSpec(context: DevelopmentSpecContext): ParsedAIDevelopmentSpecOutput {
  const { project } = context;
  const title = `${project.title} Development Specification`;

  const contentByType: Partial<
    Record<(typeof DEVELOPMENT_SPEC_SECTION_TYPES)[number], string>
  > = {
    SYSTEM_OVERVIEW: `## System Overview\n\n${project.summary}\n\nMonorepo: Next.js web app + Supabase backend.`,
    TECH_STACK: '## Tech Stack\n\n- Frontend: Next.js, React, Tailwind\n- Backend: Server Actions\n- DB: Supabase PostgreSQL',
    ARCHITECTURE: '## Architecture\n\nApp → Service → Repository → Supabase Adapter',
    DATABASE_SCHEMA: '## Database\n\n- users, profiles, matches, messages',
    API_SPECIFICATION: '## API\n\n- POST /api/matches\n- GET /api/messages',
    FRONTEND_STRUCTURE: '## Frontend\n\n- app/ routes\n- features/ modules\n- @repo/ui components',
    BACKEND_STRUCTURE: '## Backend\n\n- Server Actions\n- Repository pattern in @repo/db',
    AUTH_DESIGN: '## Auth\n\nSupabase Auth with RLS policies',
    SECURITY: '## Security\n\nRLS, input validation, HTTPS only',
    DEPLOYMENT: '## Deployment\n\nVercel + Supabase cloud',
    TEST_PLAN: '## Test Plan\n\n- Unit: services\n- E2E: critical flows',
    SPRINT_PLAN: '## Sprint Plan\n\nS1 Auth → S2 Matching → S3 Chat → S4 QA',
    DEVELOPMENT_GUIDE: '## Cursor Guide\n\n1. Run migrations\n2. Implement repositories\n3. Build features layer\n4. Wire UI pages',
  };

  return {
    title,
    sections: DEVELOPMENT_SPEC_SECTION_TYPES.map((type) => ({
      type,
      title: SECTION_TITLES[type],
      content: contentByType[type] ?? `## ${SECTION_TITLES[type]}\n\n(TBD)`,
    })),
  };
}

async function callLLM(context: DevelopmentSpecContext): Promise<GenerateDevelopmentSpecResult> {
  const contextText = buildDevelopmentSpecContextText(context);
  const rendered = renderDevelopmentSpecPrompt(contextText);
  const response = await generateJSON({ messages: rendered.messages, jsonMode: true });
  const parsed = validateAIDevelopmentSpecOutput(parseAIJsonResponse(response.text));

  return {
    output: parsed,
    provider: response.provider,
    model: response.model,
    usedMock: false,
  };
}

export async function generateDevelopmentSpecFromContext(
  context: DevelopmentSpecContext,
): Promise<GenerateDevelopmentSpecResult> {
  if (!isAIConfigured()) {
    return {
      output: buildMockDevelopmentSpec(context),
      provider: 'mock',
      model: 'context-template',
      usedMock: true,
    };
  }

  try {
    return await callLLM(context);
  } catch (firstError) {
    try {
      return await callLLM(context);
    } catch {
      throw firstError;
    }
  }
}
