import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AI_PM_FIRST_PROMPT_VERSION, AI_PM_REVIEW_MODEL, buildFirstReviewRequest, buildFollowUpRequest } from '../ai-pm-review';
import { KNOWN_FAILURE_A, KNOWN_FAILURE_B, scoreBreweryRegression } from '../ai-pm-quality-scenarios';
import {
  PREVIEW_COMPARE_RUN_ID,
  redactComparePayload,
  shouldRunPreviewQualityCompare,
} from '../../../../scripts/preview-quality-compare-once.mjs';
import {
  COMPARE_BUSINESS_INPUT,
  QUALITY3_PROMPT_VERSION,
  QUALITY4_PROMPT_VERSION,
  QUALITY4_SYSTEM_PROMPT,
  QUALITY5_OUTPUT_KEYS,
  QUALITY5_PROMPT_VERSION,
  QUALITY5_SYSTEM_PROMPT,
  QUALITY6_BREWERY_CHOICES,
  QUALITY6_PROMPT_VERSION,
  buildQuality6CompareRequest,
  quality6DecisionBlock,
  buildQuality2CompareRequest,
  buildQuality3CompareRequest,
  buildQuality5CompareRequest,
  executeQualityCompare,
  executeSprintQualityPair,
  scoreSprintGates,
  sprintGateSummary,
  compareConfounders,
} from '../ai-pm-quality-compare';
import { AI_PM_REVIEW_INPUT_TOKEN_BUDGET, clampReviewText, estimateReviewTokens, parseSections } from '../ai-pm-review';

describe('quality-2 and quality-3 compare requests', () => {
  it('keeps quality-2 equal to the product first-review request', () => {
    const compare = buildQuality2CompareRequest();
    const product = buildFirstReviewRequest(COMPARE_BUSINESS_INPUT);
    expect(compare).toEqual(product);
    const system = compare.messages[0]?.content ?? '';
    const user = compare.messages[1]?.content ?? '';
    expect(system).toContain(`프롬프트 버전 ${AI_PM_FIRST_PROMPT_VERSION}`);
    expect(user).toContain('전통주(양조장)');
    expect(user).toContain('검토 목적: 종합 사업성 검토');
    expect(user).not.toContain('alternatives, differentiation');
    expect(compare.model).toBe(AI_PM_REVIEW_MODEL);
    expect(compare.temperature).toBe(0.2);
    expect(compare.maxTokens).toBe(2400);
  });

  it('sends the quality-3 draft in full and records the two confounders', () => {
    const request = buildQuality3CompareRequest();
    const system = request.messages[0]?.content ?? '';
    const user = request.messages[1]?.content ?? '';
    expect(system.startsWith('프롬프트 버전 quality-3.')).toBe(true);
    expect(user).toContain('alternatives, differentiation');
    expect(user).toContain('전통주(양조장)');
    const confounders = compareConfounders();
    expect(confounders.map((item) => item.id)).toEqual(['user_key_list', 'product_input_clamp']);
    expect(confounders[0]?.detail).toContain('단정하지 않는다');
    expect(confounders[1]?.detail).toContain('잘린다');
  });

  it('does not call a model or the product follow-up when the key is absent', async () => {
    const report = await executeQualityCompare({});
    expect(report.status).toBe('NOT RUN');
    expect(report.productFollowUpInvoked).toBe(false);
    expect(report.calls.map((call) => call.promptVersion)).toEqual([AI_PM_FIRST_PROMPT_VERSION, QUALITY3_PROMPT_VERSION]);
    expect(report.calls.every((call) => call.status === 'not_run' && call.raw === null)).toBe(true);
    const follow = buildFollowUpRequest({
      originalInput: COMPARE_BUSINESS_INPUT,
      sections: {
        customer: '관광객',
        problem: '예약',
        market: '미확인',
        revenueModel: '가설',
        execution: '구상',
        risks: ['수요'],
        uncertain: ['협력'],
        hypotheses: ['협력'],
        judgment: '보류',
        nextQuestion: '질문',
        nextQuestionReason: '갈림길',
        answerHint: '',
        claimConfirmation: null,
      },
      feedback: null,
      supplement: '아직 협력 양조장이 없다.',
    });
    const followText = follow.messages.map((message) => message.content).join('\n');
    expect(followText).not.toContain('프롬프트 버전 quality-3');
  });

  it('runs the compare only on a non-main preview build and strips secrets', () => {
    expect(shouldRunPreviewQualityCompare({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'cursor/preview-quality-compare-4b88' })).toBe(true);
    expect(shouldRunPreviewQualityCompare({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(false);
    expect(shouldRunPreviewQualityCompare({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(false);
    expect(shouldRunPreviewQualityCompare({})).toBe(false);
    expect(PREVIEW_COMPARE_RUN_ID).toBe('q1-quality6-once-2026-10-29');
    expect(redactComparePayload({ note: 'sk-testsecretvalue and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb' }, ['service-role-secret'])).toEqual({
      note: '[redacted] and [redacted-jwt]',
    });
    const script = readFileSync(new URL('../../../../scripts/preview-quality-compare-once.mjs', import.meta.url), 'utf8');
    expect(script).toContain('quality-6-request.json');
    expect(script).not.toContain('quality-compare-requests.json');
    expect(script).not.toContain('/api/ai-pm-review/follow-up');
    expect(script).not.toContain('buildFollowUpRequest');
    expect(script).not.toContain('vitest');
    const packageJson = readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8');
    expect(packageJson).toContain('"build": "sh scripts/run-web-build.sh"');
    const buildScript = readFileSync(new URL('../../../../scripts/run-web-build.sh', import.meta.url), 'utf8');
    expect(buildScript).toContain('node scripts/preview-quality-compare-once.mjs');
    expect(buildScript).toContain('exec next build');
    expect(buildScript).not.toContain('&&');
    const rootBuild = readFileSync(new URL('../../../../../../vercel.json', import.meta.url), 'utf8');
    const appBuild = readFileSync(new URL('../../../../vercel.json', import.meta.url), 'utf8');
    expect(rootBuild).toContain('"buildCommand": "pnpm --filter web build"');
    expect(appBuild).toContain('"buildCommand": "cd ../.. && pnpm --filter web build"');
    const child = spawnSync(process.execPath, [fileURLToPath(new URL('../../../../scripts/preview-quality-compare-once.mjs', import.meta.url))], {
      env: { ...process.env, VERCEL_ENV: 'production', GPT_API_KEY: 'sk-testsecretvalue' },
      encoding: 'utf8',
    });
    expect(child.status).toBe(0);
    expect(child.stdout).toContain('preview-quality-compare skip');
    expect(child.stdout).not.toContain('sk-testsecretvalue');
  });

  it('keeps the quality-4 question draft out of the product prompt', () => {
    const product = buildFirstReviewRequest(COMPARE_BUSINESS_INPUT);
    const system = product.messages[0]?.content ?? '';
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(system).toContain('프롬프트 버전 quality-2');
    expect(system).not.toContain(QUALITY4_PROMPT_VERSION);
    expect(QUALITY4_PROMPT_VERSION).toBe('quality-4-draft');
    expect(QUALITY4_SYSTEM_PROMPT).toContain('프롬프트 버전 quality-4.');
    expect(QUALITY4_SYSTEM_PROMPT).toContain('customer와 payer를 나눈다');
    expect(QUALITY4_SYSTEM_PROMPT).toContain('가설이라고 적고');
    expect(QUALITY4_SYSTEM_PROMPT).toContain('높다, 낮다, 미정인지만 묻지 않는다');
    expect(QUALITY4_SYSTEM_PROMPT).toContain('무엇을 먼저 팔지');
    expect(QUALITY4_SYSTEM_PROMPT).toContain('아직 정하지 못함');
    expect(QUALITY4_SYSTEM_PROMPT.length).toBeLessThan(2200);
    const fixture = readFileSync(new URL('../quality-compare-requests.json', import.meta.url), 'utf8');
    expect(fixture).not.toContain('quality-4');
    expect(fixture).toContain('quality-5-cpo-draft');
    expect(fixture).not.toContain('quality-3-draft');
  });

  it('keeps quality-5 as a candidate with the same keys in both messages', async () => {
    const product = buildFirstReviewRequest(COMPARE_BUSINESS_INPUT);
    const candidate = buildQuality5CompareRequest();
    const system = candidate.messages[0]?.content ?? '';
    const user = candidate.messages[1]?.content ?? '';
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(product.messages[0]?.content).toContain('프롬프트 버전 quality-2');
    expect(product.messages[0]?.content).not.toContain(QUALITY5_PROMPT_VERSION);
    expect(system).toBe(QUALITY5_SYSTEM_PROMPT);
    expect(system).toContain(`키는 다음만 사용하고 모두 포함한다. ${QUALITY5_OUTPUT_KEYS}.`);
    expect(user).toContain(`키: ${QUALITY5_OUTPUT_KEYS}.`);
    expect(user).toContain('양조장 체험');
    expect(user).toContain('온라인 마케팅');
    expect(system).toContain('두 축이 없는 사업에는 그 문장을 붙이지 않고');
    expect(system).toContain('이용자 경험을 먼저 검증');
    expect(system).toContain('질문과 선택지는 같은 의사결정에 대응해야 하며');
    expect(system).toContain('\n13. JSON 객체만 반환한다.');
    expect(system).toContain('공급자 지원을 먼저 검증');
    expect(candidate.model).toBe(product.model);
    expect(candidate.temperature).toBe(product.temperature);
    expect(candidate.maxTokens).toBe(product.maxTokens);
    expect(candidate.responseFormat).toEqual(product.responseFormat);
    const room = AI_PM_REVIEW_INPUT_TOKEN_BUDGET - estimateReviewTokens(system);
    expect(clampReviewText(user, room)).toBe(user);
    const missingKey = await executeSprintQualityPair({});
    expect(missingKey.status).toBe('NOT RUN');
    expect(missingKey.productFollowUpInvoked).toBe(false);
    expect(missingKey.calls.map((call) => call.promptVersion)).toEqual(['quality-2', QUALITY5_PROMPT_VERSION]);
    expect(missingKey.calls.every((call) => call.raw === null)).toBe(true);
    expect(sprintGateSummary(scoreSprintGates(null, COMPARE_BUSINESS_INPUT))).toBe('NOT RUN');
    const failed = scoreSprintGates(
      '{"revenueModel":"양조장으로부터의 수수료 및 체험 참가비.","nextQuestion":"양조장과의 협력 가능성은 어떻게 되는가?","choices":["높다","낮다","미정"]}',
      COMPARE_BUSINESS_INPUT,
    );
    expect(failed.find((item) => item.id === 'Q2')?.status).toBe('fail');
    expect(sprintGateSummary(failed)).toBe('FAIL');
    const shaped = {
      summary: '관광객의 양조장 체험과 양조장의 온라인 마케팅 지원을 함께 구상한다.',
      customer: '전통주를 좋아하는 내국인·외국인 관광객',
      problem: '미확인',
      value: '미확인',
      operatingModel: '미확인',
      alternatives: '미확인',
      differentiation: '미확인',
      payer: '미확인',
      revenueModel: '수익원은 가설이며 원문에서 확인되지 않았다.',
      market: '미확인',
      competition: '미확인',
      operations: '미확인',
      profitability: '미확인',
      strengths: ['두 축이 한 입력에 있다'],
      risks: ['지불자가 확인되지 않았다'],
      assumptions: ['무엇을 먼저 검증할지 정하지 않았다'],
      evidenceToChange: ['한쪽을 먼저 검증하겠다는 대표자 답'],
      founderFacts: ['체험과 마케팅 지원을 구상 중이다'],
      inferences: ['추론: 두 축의 우선순위는 아직 없다'],
      judgment: '예비 판단. 우선 검증 축이 미확인이다.',
      nextVerification: '양조장 몇 곳에 마케팅 지원의 필요를 묻는다.',
      nextQuestion: '무엇을 먼저 검증할 것인가?',
      nextQuestionReason: '우선순위가 다음 검증 대상을 바꾼다.',
      choices: [
        '관광객 체험을 먼저 검증',
        '양조장 마케팅 지원을 먼저 검증',
        '체험과 마케팅 지원을 결합해 검증',
        '아직 우선순위를 결정하지 못함',
        '기타 / 직접 입력',
      ],
    };
    expect(parseSections(JSON.stringify(shaped), COMPARE_BUSINESS_INPUT)?.analysis?.differentiation).toBe('미확인');
    const scored = scoreSprintGates(JSON.stringify(shaped), COMPARE_BUSINESS_INPUT);
    expect(scored.find((item) => item.id === 'Q1')?.status).toBe('pass');
    expect(scored.find((item) => item.id === 'Q6')?.status).toBe('pass');
    expect(scored.find((item) => item.id === 'Q8')?.status).toBe('not_run');
    expect(sprintGateSummary(scored)).toBe('BLOCKED');
  });

  it('keeps the quality-6 decision list on the two-axis brewery input only', () => {
    const brewery = buildQuality6CompareRequest();
    const user = brewery.messages[1]?.content ?? '';
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(brewery.messages[0]?.content).toContain(QUALITY6_PROMPT_VERSION);
    expect(brewery.messages[0]?.content).not.toContain('quality-5-cpo-draft');
    expect(user).toContain('무엇을 먼저 검증할 것인가?');
    for (const choice of QUALITY6_BREWERY_CHOICES) expect(user).toContain(choice);
    expect(user).toContain('항목마다 가설:');
    expect(user).toContain('payer는 미확인');
    const experienceOnly = '외국인 관광객에게 막걸리 만들기체험만 안내한다.';
    const supportOnly = '양조장 온라인 마케팅 페이지 제작만 대행한다.';
    const statedRevenue = `${COMPARE_BUSINESS_INPUT}\n체험 참가비는 1인 3만원으로 정했다.`;
    expect(quality6DecisionBlock(experienceOnly)).toContain('다섯 선택지를 쓰지 않는다');
    expect(quality6DecisionBlock(experienceOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[1]);
    expect(quality6DecisionBlock(supportOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(quality6DecisionBlock(statedRevenue)).toContain('입력에 적힌 수익은 사실로 적는다');
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY6_PROMPT_VERSION);
    expect(parseSections('{"summary":"없다"}', COMPARE_BUSINESS_INPUT)).toBeNull();
  });

  it('keeps the preview request fixture equal to the builders', () => {
    const fixtureUrl = new URL('../quality-compare-requests.json', import.meta.url);
    const fresh = {
      businessInput: COMPARE_BUSINESS_INPUT,
      confounders: compareConfounders(),
      requests: [
        { promptVersion: AI_PM_FIRST_PROMPT_VERSION, request: buildQuality2CompareRequest() },
        { promptVersion: QUALITY5_PROMPT_VERSION, request: buildQuality5CompareRequest() },
      ],
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(fixtureUrl, `${JSON.stringify(fresh, null, 2)}\n`);
    expect(JSON.parse(readFileSync(fixtureUrl, 'utf8'))).toEqual(fresh);
    const repairUrl = new URL('../quality-6-request.json', import.meta.url);
    const repair = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-pair-recorded.json',
      requests: [{ promptVersion: QUALITY6_PROMPT_VERSION, request: buildQuality6CompareRequest() }],
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(repairUrl, `${JSON.stringify(repair, null, 2)}\n`);
    expect(JSON.parse(readFileSync(repairUrl, 'utf8'))).toEqual(repair);
  });

  it('fails the known brewery regressions and passes a hedged alternative', () => {
    expect(scoreBreweryRegression(KNOWN_FAILURE_A, COMPARE_BUSINESS_INPUT).regressionA).toBe('fail');
    expect(scoreBreweryRegression(KNOWN_FAILURE_B, COMPARE_BUSINESS_INPUT).regressionB).toBe('fail');
    const hedged = scoreBreweryRegression(
      JSON.stringify({
        nextQuestion: '체험을 찾을 사람이 양조장에 직접 예약하는가, 우리가 예약을 대신 받는가?',
        choices: ['양조장 직접 예약', '우리가 예약', '아직 정하지 못함', '기타 / 직접 입력'],
        revenueModel: '가설: 양조장이 마케팅 지원의 수수료를 낼 수 있다. 원문에 없는 참가비는 확정 수익이 아니다.',
      }),
      COMPARE_BUSINESS_INPUT,
    );
    expect(hedged.regressionA).toBe('pass');
    expect(hedged.regressionB).toBe('pass');
    expect(scoreBreweryRegression(null, COMPARE_BUSINESS_INPUT).regressionA).toBe('not_run');
  });
});
