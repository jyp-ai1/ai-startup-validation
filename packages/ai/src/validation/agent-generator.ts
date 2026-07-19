import type { ValidationAgentContext } from '@repo/types/validation';

import { renderValidationAgentPrompt } from '../prompts/validation-agent';
import { generateJSON, isAIConfigured } from './ai-client';
import { buildValidationAgentContextText } from './agent-context-builder';
import {
  parseAIJsonResponse,
  validateValidationAgentOutput,
  type ParsedValidationAgentOutput,
} from './agent-schemas';

export type GenerateValidationAgentResult = {
  output: ParsedValidationAgentOutput;
  provider: string;
  model: string;
  usedMock: boolean;
};

function buildMockAgentResponse(context: ValidationAgentContext): ParsedValidationAgentOutput {
  const { project, validationScore, knowledgeResults, userQuestion } = context;
  const score = validationScore?.totalScore;
  const decision =
    score === undefined
      ? 'INSUFFICIENT DATA'
      : score >= 70
        ? 'GO'
        : score >= 50
          ? 'CONDITIONAL GO'
          : 'NO GO';

  const knowledgeSources = knowledgeResults.slice(0, 3).map((result) => ({
    title: result.title,
    source: result.source,
    excerpt: result.content.slice(0, 200),
    score: result.score,
  }));

  return {
    recommendation: `## AI Validation Recommendation

**질문:** ${userQuestion}

### 분석
${project.title} 프로젝트 기준으로 검증 데이터를 분석했습니다.

- **시장:** Evidence ${context.evidence.length}건, Knowledge hit ${knowledgeResults.length}건
- **고객:** VOC ${context.voc.length}건
- **경쟁:** Competitor ${context.competitors.length}건
${score !== undefined ? `- **Validation Score:** ${score}/100 (${validationScore?.decision ?? decision})` : ''}

### 의견
${project.summary}

추가 Evidence 수집과 VOC 인터뷰를 통해 가설을 검증하세요.`,
    summary: `${project.title} — ${decision} (mock 분석). Knowledge ${knowledgeResults.length}건 참조.`,
    decision,
    confidence: knowledgeResults.length >= 2 ? 'MEDIUM' : 'LOW',
    sources: knowledgeSources,
    nextActions: [
      'Knowledge Base에서 Evidence 추가 처리',
      'VOC Pain Point 심화 인터뷰',
      'Validation Score 재평가',
    ],
  };
}

async function callLLM(context: ValidationAgentContext): Promise<GenerateValidationAgentResult> {
  const contextText = buildValidationAgentContextText(context);
  const rendered = renderValidationAgentPrompt(contextText);
  const response = await generateJSON({ messages: rendered.messages, jsonMode: true });
  const parsed = validateValidationAgentOutput(parseAIJsonResponse(response.text));

  return {
    output: parsed,
    provider: response.provider,
    model: response.model,
    usedMock: false,
  };
}

export async function generateValidationAgentResponse(
  context: ValidationAgentContext,
): Promise<GenerateValidationAgentResult> {
  if (!isAIConfigured()) {
    return {
      output: buildMockAgentResponse(context),
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
