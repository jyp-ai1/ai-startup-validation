import type { ValidationReportContext } from '@repo/types/validation';
import { REPORT_SECTION_TYPES } from '@repo/types/validation';

import { renderValidationReportPrompt } from '../prompts/validation-report';
import { generateJSON, isAIConfigured, resolveAIModel, resolveAIProvider } from './ai-client';
import { buildValidationContextText } from './context-builder';
import {
  parseAIJsonResponse,
  validateAIReportOutput,
  type ParsedAIValidationReportOutput,
} from './schemas';

export type GenerateValidationReportResult = {
  output: ParsedAIValidationReportOutput;
  provider: string;
  model: string;
  usedMock: boolean;
};

function buildMockReport(context: ValidationReportContext): ParsedAIValidationReportOutput {
  const { project, validationScore } = context;
  const decision = validationScore?.decision ?? 'CONDITIONAL_GO';
  const total = validationScore?.totalScore ?? 0;

  const competitorLines =
    context.competitors.length > 0
      ? context.competitors
          .map((c) => `- **${c.name}** (${c.category}): ${c.differentiation ?? '차별화 정보 없음'}`)
          .join('\n')
      : '- 경쟁사 데이터 없음';

  const vocLines =
    context.voc.length > 0
      ? context.voc.map((v) => `- ${v.painPoint} (심각도: ${v.severity ?? 'N/A'})`).join('\n')
      : '- VOC 데이터 없음';

  const grantLines =
    context.grants.length > 0
      ? context.grants.map((g) => `- ${g.name} (fit ${g.fitScore ?? 'N/A'})`).join('\n')
      : '- 정부지원 데이터 없음';

  return {
    summary: `${project.title} — ${project.summary} 검증 점수 ${total}점, ${decision} 판정.`,
    sections: REPORT_SECTION_TYPES.map((type) => {
      switch (type) {
        case 'EXECUTIVE_SUMMARY':
          return {
            type,
            title: 'Executive Summary',
            content: `## 개요\n\n${project.summary}\n\n**검증 결과:** ${total}점 (${decision})`,
          };
        case 'PROBLEM':
          return {
            type,
            title: 'Problem Definition',
            content: `## 문제 정의\n\n${project.problem ?? '문제 정의 데이터 없음'}`,
          };
        case 'MARKET_ANALYSIS':
          return {
            type,
            title: 'Market Analysis',
            content: `## 시장 분석\n\n- 산업: ${project.industry ?? 'N/A'}\n- 타겟: ${project.targetCustomer ?? 'N/A'}`,
          };
        case 'CUSTOMER_ANALYSIS':
          return {
            type,
            title: 'Customer Analysis',
            content: `## 고객 분석\n\n${vocLines}`,
          };
        case 'COMPETITOR_ANALYSIS':
          return {
            type,
            title: 'Competitor Analysis',
            content: `## 경쟁 분석\n\n${competitorLines}`,
          };
        case 'BUSINESS_MODEL':
          return {
            type,
            title: 'Business Model',
            content: `## 비즈니스 모델\n\n${project.businessModel ?? 'BM 데이터 없음'}`,
          };
        case 'GOVERNMENT_SUPPORT':
          return {
            type,
            title: 'Government Support',
            content: `## 정부지원\n\n${grantLines}`,
          };
        case 'VALIDATION_RESULT':
          return {
            type,
            title: 'Validation Result',
            content: validationScore
              ? `## 검증 결과\n\n- **총점:** ${validationScore.totalScore}/100\n- **판정:** ${validationScore.decision}\n- **코멘트:** ${validationScore.comment ?? 'N/A'}`
              : '## 검증 결과\n\nValidation Score 데이터 없음',
          };
        case 'RISK':
          return {
            type,
            title: 'Risk',
            content: '## 리스크\n\n- 시장 진입 장벽\n- 고객 확보 난이도\n- 경쟁 심화 가능성',
          };
        case 'NEXT_ACTION':
          return {
            type,
            title: 'Next Action',
            content: '## 다음 액션\n\n1. MVP 프로토타입 개발\n2. 고객 인터뷰 확대\n3. 정부지원사업 신청 검토',
          };
        default:
          return { type, title: type, content: '' };
      }
    }),
  };
}

async function callLLM(context: ValidationReportContext): Promise<GenerateValidationReportResult> {
  const contextText = buildValidationContextText(context);
  const rendered = renderValidationReportPrompt(contextText);
  const provider = resolveAIProvider();
  const model = resolveAIModel(provider);

  const response = await generateJSON({
    messages: rendered.messages,
    jsonMode: true,
  });

  const parsed = validateAIReportOutput(parseAIJsonResponse(response.text));

  return {
    output: parsed,
    provider: response.provider,
    model: response.model,
    usedMock: false,
  };
}

/** Generate validation report with LLM (or mock when AI not configured). */
export async function generateValidationReportFromContext(
  context: ValidationReportContext,
): Promise<GenerateValidationReportResult> {
  if (!isAIConfigured()) {
    return {
      output: buildMockReport(context),
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

export { buildValidationContextText } from './context-builder';
export {
  generateCompletion,
  generateJSON,
  isAIConfigured,
  resolveAIProvider,
  resolveAIModel,
} from './ai-client';
