import type { PRDContext } from '@repo/types/validation';
import { PRD_SECTION_TYPES } from '@repo/types/validation';

import { renderPRDGeneratorPrompt } from '../prompts/prd-generator';
import { generateJSON, isAIConfigured } from './ai-client';
import { buildPRDContextText } from './prd-context-builder';
import {
  parseAIJsonResponse,
  validateAIPRDOutput,
  type ParsedAIPRDOutput,
} from './prd-schemas';

export type GeneratePRDResult = {
  output: ParsedAIPRDOutput;
  provider: string;
  model: string;
  usedMock: boolean;
};

const SECTION_TITLES: Record<(typeof PRD_SECTION_TYPES)[number], string> = {
  PRODUCT_OVERVIEW: 'Product Overview',
  PROBLEM_DEFINITION: 'Problem Definition',
  TARGET_USER: 'Target User',
  USER_PERSONA: 'User Persona',
  USER_FLOW: 'User Flow',
  FEATURE_REQUIREMENTS: 'Feature Requirements',
  FUNCTIONAL_REQUIREMENTS: 'Functional Requirements',
  NON_FUNCTIONAL_REQUIREMENTS: 'Non-Functional Requirements',
  MVP_SCOPE: 'MVP Scope',
  TECH_REQUIREMENTS: 'Technical Requirements',
  DATABASE_DESIGN: 'Database Design',
  API_SPECIFICATION: 'API Specification',
  EDGE_CASE: 'Edge Case',
  ROADMAP: 'Roadmap',
};

function buildMockPRD(context: PRDContext): ParsedAIPRDOutput {
  const { project } = context;
  const title = `${project.title} PRD`;

  const contentByType: Partial<Record<(typeof PRD_SECTION_TYPES)[number], string>> = {
    PRODUCT_OVERVIEW: `## Product Overview\n\n${project.summary}\n\n**Solution:** ${project.solution ?? 'N/A'}`,
    PROBLEM_DEFINITION: `## Problem\n\n${project.problem ?? 'N/A'}`,
    TARGET_USER: `## Target User\n\n${project.targetCustomer ?? 'N/A'}`,
    USER_PERSONA: '## Persona\n\n- 70대 독거 여성, 스마트폰 기본 사용 가능\n- 지역 커뮤니티 활동 관심',
    USER_FLOW: '## User Flow\n\n1. 가입 → 2. 프로필 → 3. 매칭 → 4. 채팅 → 5. 모임',
    FEATURE_REQUIREMENTS: '## Features\n\n- P0: 프로필, AI 매칭\n- P1: 채팅\n- P2: 모임',
    FUNCTIONAL_REQUIREMENTS: '## Functional\n\n- 매칭 알고리즘 정확도 ≥ 80%\n- 응답 시간 < 2s',
    NON_FUNCTIONAL_REQUIREMENTS: '## Non-Functional\n\n- WCAG 2.1 AA\n- 99.9% uptime',
    MVP_SCOPE: '## MVP\n\n프로필 + 매칭 + 채팅 (3개월)',
    TECH_REQUIREMENTS: '## Tech Stack\n\n- Next.js, Supabase, OpenAI API',
    DATABASE_DESIGN: '## DB\n\n- users, profiles, matches, messages',
    API_SPECIFICATION: '## API\n\n- POST /api/matches\n- GET /api/messages',
    EDGE_CASE: '## Edge Cases\n\n- 매칭 실패 시 재시도\n- 신고/차단',
    ROADMAP: '## Roadmap\n\nQ1 MVP → Q2 커뮤니티 → Q3 B2B',
  };

  return {
    title,
    sections: PRD_SECTION_TYPES.map((type) => ({
      type,
      title: SECTION_TITLES[type],
      content: contentByType[type] ?? `## ${SECTION_TITLES[type]}\n\n(TBD)`,
    })),
  };
}

async function callLLM(context: PRDContext): Promise<GeneratePRDResult> {
  const contextText = buildPRDContextText(context);
  const rendered = renderPRDGeneratorPrompt(contextText);
  const response = await generateJSON({ messages: rendered.messages, jsonMode: true });
  const parsed = validateAIPRDOutput(parseAIJsonResponse(response.text));

  return {
    output: parsed,
    provider: response.provider,
    model: response.model,
    usedMock: false,
  };
}

export async function generatePRDFromContext(context: PRDContext): Promise<GeneratePRDResult> {
  if (!isAIConfigured()) {
    return {
      output: buildMockPRD(context),
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
