import type { BusinessPlanContext } from '@repo/types/validation';
import { BUSINESS_PLAN_SECTION_TYPES } from '@repo/types/validation';

import { renderBusinessPlanPrompt } from '../prompts/business-plan';
import { generateJSON, isAIConfigured } from './ai-client';
import { buildBusinessPlanContextText } from './business-plan-context-builder';
import {
  parseAIJsonResponse,
  validateAIBusinessPlanOutput,
  type ParsedAIBusinessPlanOutput,
} from './business-plan-schemas';

export type GenerateBusinessPlanResult = {
  output: ParsedAIBusinessPlanOutput;
  provider: string;
  model: string;
  usedMock: boolean;
};

function buildMockBusinessPlan(context: BusinessPlanContext): ParsedAIBusinessPlanOutput {
  const { project, validationScore } = context;
  const title = `${project.title} 사업계획서`;

  const sectionContent: Partial<Record<(typeof BUSINESS_PLAN_SECTION_TYPES)[number], string>> = {
    OVERVIEW: `## 사업 개요\n\n${project.summary}`,
    BACKGROUND: `## 창업 배경\n\n${project.industry ?? '시니어'} 시장의 사회적 문제 해결 필요성`,
    PROBLEM: `## 문제 정의\n\n${project.problem ?? '문제 정의 데이터 없음'}`,
    MARKET: `## 시장 분석\n\n- 타겟: ${project.targetCustomer ?? 'N/A'}\n- 산업: ${project.industry ?? 'N/A'}`,
    CUSTOMER: context.voc.length
      ? `## 고객 분석\n\n${context.voc.map((v) => `- ${v.painPoint}`).join('\n')}`
      : '## 고객 분석\n\nVOC 데이터 없음',
    SOLUTION: `## 해결 방안\n\n${project.solution ?? '솔루션 데이터 없음'}`,
    PRODUCT: `## 제품/서비스\n\n${project.title} 플랫폼 — AI 기반 매칭 서비스`,
    COMPETITION: context.competitors.length
      ? `## 경쟁 우위\n\n${context.competitors.map((c) => `- ${c.name}: ${c.differentiation ?? 'N/A'}`).join('\n')}`
      : '## 경쟁 우위\n\n경쟁사 데이터 없음',
    BUSINESS_MODEL: `## 비즈니스 모델\n\n${project.businessModel ?? 'BM 데이터 없음'}`,
    GROWTH: '## 성장 전략\n\n1. 파일럿 지역 → 전국 확장\n2. B2B 커뮤니티 파트너십',
    MARKETING: '## 마케팅 전략\n\n- 지역 커뮤니티 센터 제휴\n- 고령층 친화 오프라인 세미나',
    OPERATION: '## 운영 계획\n\n- CS 전담팀\n- 안전 매칭 프로세스',
    TECHNOLOGY: '## 기술 개발\n\n- AI 매칭 엔진\n- 고령층 UX',
    GOVERNMENT: context.grants.length
      ? `## 정부지원\n\n${context.grants.map((g) => `- ${g.name}`).join('\n')}`
      : '## 정부지원\n\n지원사업 데이터 없음',
    RISK: '## 리스크\n\n- 사용자 확보\n- 규제 변화\n- 경쟁 심화',
    ROADMAP: validationScore
      ? `## 실행 계획\n\n검증 점수 ${validationScore.totalScore}점 (${validationScore.decision}) 기반 12개월 로드맵`
      : '## 실행 계획\n\nValidation Score 데이터 없음',
  };

  const titles: Record<(typeof BUSINESS_PLAN_SECTION_TYPES)[number], string> = {
    OVERVIEW: '사업 개요',
    BACKGROUND: '창업 배경',
    PROBLEM: '문제 정의',
    MARKET: '시장 분석',
    CUSTOMER: '고객 분석',
    SOLUTION: '해결 방안',
    PRODUCT: '제품/서비스 설명',
    COMPETITION: '경쟁 우위',
    BUSINESS_MODEL: '비즈니스 모델',
    GROWTH: '성장 전략',
    MARKETING: '마케팅 전략',
    OPERATION: '운영 계획',
    TECHNOLOGY: '기술 개발 계획',
    GOVERNMENT: '정부지원 활용 계획',
    RISK: '예상 리스크',
    ROADMAP: '향후 실행 계획',
  };

  return {
    title,
    sections: BUSINESS_PLAN_SECTION_TYPES.map((type) => ({
      type,
      title: titles[type],
      content: sectionContent[type] ?? `## ${titles[type]}\n\n(내용 없음)`,
    })),
  };
}

async function callLLM(context: BusinessPlanContext): Promise<GenerateBusinessPlanResult> {
  const contextText = buildBusinessPlanContextText(context);
  const rendered = renderBusinessPlanPrompt(contextText);

  const response = await generateJSON({
    messages: rendered.messages,
    jsonMode: true,
  });

  const parsed = validateAIBusinessPlanOutput(parseAIJsonResponse(response.text));

  return {
    output: parsed,
    provider: response.provider,
    model: response.model,
    usedMock: false,
  };
}

export async function generateBusinessPlanFromContext(
  context: BusinessPlanContext,
): Promise<GenerateBusinessPlanResult> {
  if (!isAIConfigured()) {
    return {
      output: buildMockBusinessPlan(context),
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
