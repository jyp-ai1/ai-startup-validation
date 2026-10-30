import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  AI_PM_FIRST_PROMPT_VERSION,
  AI_PM_REVIEW_MODEL,
  buildFirstReviewRequest,
  buildFollowUpRequest,
  FOLLOW_UP_BREWERY_VERIFICATION_PLAN,
  FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM,
  followUpStructureCoverage,
  parseSections,
  presentReview,
  reviewContractError,
} from '../ai-pm-review';
import { reviewFailureCopy } from '../ai-pm-review-failure-copy';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';
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
  QUALITY7_PROMPT_VERSION,
  QUALITY7_SYSTEM_PROMPT,
  QUALITY8_PROMPT_VERSION,
  QUALITY9_EXPERIENCE_INPUT,
  QUALITY9_PROMPT_VERSION,
  QUALITY9_SUPPLIER_INPUT,
  buildQuality6CompareRequest,
  QUALITY10_EXPERIENCE_CHOICES,
  QUALITY10_PROMPT_VERSION,
  QUALITY10_SUPPLIER_CHOICES,
  buildQuality9CompareRequest,
  buildQuality9InputRequests,
  QUALITY11_PROMPT_VERSION,
  buildQuality10CompareRequest,
  buildQuality10InputRequests,
  buildQuality11CompareRequest,
  buildQuality11InputRequests,
  QUALITY12_PROMPT_VERSION,
  QUALITY13_PROMPT_VERSION,
  QUALITY14_PROMPT_VERSION,
  INCREMENTAL_STRUCTURE_CHOICE,
  INCREMENTAL_STRUCTURE_DATA_CLASS,
  INCREMENTAL_STRUCTURE_NOTICE,
  INCREMENTAL_STRUCTURE_SUPPLEMENT,
  INCREMENTAL_STRUCTURE_VERSION,
  buildIncrementalStructureRequest,
  incrementalFieldDelta,
  observeIncrementalReflection,
  incrementalStructureCoverage,
  incrementalStructureReady,
  productFollowUpStructureReport,
  buildIndependentInputRequests,
  buildQuality13InputRequests,
  buildQuality14InputRequests,
  quality13DecisionCue,
  quality13UserBlock,
  quality14UserBlock,
  buildQuality12CompareRequest,
  buildQuality12InputRequests,
  branchContractPass,
  quality10Branch,
  quality10UserBlock,
  quality11UserBlock,
  quality12UserBlock,
  scoreBranchContract,
  quality9EvidenceBlock,
  quality9Inference,
  scoreInferenceSeparation,
  buildQuality7CompareRequest,
  buildQuality8CompareRequest,
  quality6DecisionBlock,
  quality7RevenueString,
  quality7UserBlock,
  quality8EvidenceBlock,
  quality8FounderFacts,
  scoreEvidenceIntegrity,
  scoreRevenueContract,
  buildQuality2CompareRequest,
  buildQuality3CompareRequest,
  buildQuality5CompareRequest,
  executeQualityCompare,
  executeSprintQualityPair,
  scoreSprintGates,
  sprintGateSummary,
  compareConfounders,
} from '../ai-pm-quality-compare';
import { AI_PM_REVIEW_INPUT_TOKEN_BUDGET, clampReviewText, estimateReviewTokens } from '../ai-pm-review';

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
      answerOrigin: 'founder-input',
    });
    const followText = follow.messages.map((message) => message.content).join('\n');
    expect(followText).not.toContain('프롬프트 버전 quality-3');
  });

  it('runs the compare only on a non-main preview build and strips secrets', () => {
    expect(shouldRunPreviewQualityCompare({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'cursor/preview-quality-compare-4b88' })).toBe(true);
    expect(shouldRunPreviewQualityCompare({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(false);
    expect(shouldRunPreviewQualityCompare({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' })).toBe(false);
    expect(shouldRunPreviewQualityCompare({})).toBe(false);
    expect(PREVIEW_COMPARE_RUN_ID).toBe('q1-incremental-reflection-meaning-2026-10-30');
    expect(redactComparePayload({ note: 'sk-testsecretvalue and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb' }, ['service-role-secret'])).toEqual({
      note: '[redacted] and [redacted-jwt]',
    });
    const script = readFileSync(new URL('../../../../scripts/preview-quality-compare-once.mjs', import.meta.url), 'utf8');
    expect(script).toContain('incremental-reflection-meaning-request.json');
    expect(script).toContain('이전 JSON과 같은 응답을 다시 내면 실패다');
    expect(script).toContain('judgment_changed_by_choice');
    expect(script).toContain('q1-incremental-reflection-choice-repair-2026-10-30');
    expect(script).not.toContain('q1-incremental-reflection-choice-repair-2026-10-30.json');
    expect(script).not.toContain('incremental-reflection-choice-repair-request.json');
    expect(script).toContain('q1-incremental-reflection-input-trace-2026-10-30');
    expect(script).not.toContain('q1-incremental-reflection-input-trace-2026-10-30.json');
    expect(script).not.toContain('incremental-reflection-input-trace-request.json');
    expect(script).toContain('q1-incremental-reflection-review-fields-2026-10-30');
    expect(script).not.toContain('q1-incremental-reflection-review-fields-2026-10-30.json');
    expect(script).not.toContain('incremental-reflection-review-fields-request.json');
    expect(script).toContain('q1-incremental-reflection-reason-quality-2026-10-30');
    expect(script).not.toContain('q1-incremental-reflection-reason-quality-2026-10-30.json');
    expect(script).not.toContain('incremental-reflection-reason-quality-request.json');
    expect(script).toContain('reviewFieldGaps');
    expect(script).toContain('json_schema');
    expect(script).toContain(':repair');
    expect(script).toContain('q1-incremental-reflection-normalize-2026-10-30');
    expect(script).not.toContain('incremental-reflection-normalize-request.json');
    expect(script).not.toContain('q1-incremental-reflection-normalize-2026-10-30.json');
    expect(script).toContain('q1-incremental-reflection-question-2026-10-29');
    expect(script).not.toContain('incremental-reflection-question-request.json');
    expect(script).not.toContain('q1-incremental-reflection-question-2026-10-29.json');
    expect(script).toContain('q1-incremental-reflection-link-2026-10-29');
    expect(script).not.toContain('q1-incremental-reflection-link-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-link-request.json');
    expect(script).toContain('q1-incremental-reflection-element-2026-10-29');
    expect(script).not.toContain('q1-incremental-reflection-element-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-element-request.json');
    expect(script).toContain('q1-incremental-reflection-preserve-2026-10-29');
    expect(script).not.toContain('q1-incremental-reflection-preserve-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-preserve-request.json');
    expect(script).not.toContain('q1-incremental-reflection-reason-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-reason-request.json');
    expect(script).not.toContain('q1-incremental-reflection-trace-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-trace-request.json');
    expect(script).not.toContain('q1-incremental-reflection-source-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-source-request.json');
    expect(script).not.toContain('q1-incremental-reflection-grounds-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-grounds-request.json');
    expect(script).not.toContain('q1-incremental-reflection-array-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-array-request.json');
    expect(script).not.toContain('q1-incremental-reflection-output-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-output-request.json');
    expect(script).not.toContain('q1-incremental-reflection-2026-10-29.json');
    expect(script).not.toContain('incremental-reflection-request.json');
    expect(script).not.toContain('incremental-structure-request.json');
    expect(script).not.toContain('quality-14-independent-request.json');
    expect(script).not.toContain('quality-13-independent-request.json');
    expect(script).not.toContain('quality-2-independent-request.json');
    expect(script).not.toContain('quality-12-inputs-request.json');
    expect(script).not.toContain('quality-11-inputs-request.json');
    expect(script).not.toContain('quality-10-inputs-request.json');
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
    const nextUrl = new URL('../quality-7-request.json', import.meta.url);
    const next = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-pair-recorded.json',
      requests: [{ promptVersion: QUALITY7_PROMPT_VERSION, request: buildQuality7CompareRequest() }],
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(nextUrl, `${JSON.stringify(next, null, 2)}\n`);
    expect(JSON.parse(readFileSync(nextUrl, 'utf8'))).toEqual(next);
    const evidenceUrl = new URL('../quality-8-request.json', import.meta.url);
    const evidence = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality7-recorded.json',
      requests: [{ promptVersion: QUALITY8_PROMPT_VERSION, request: buildQuality8CompareRequest() }],
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(evidenceUrl, `${JSON.stringify(evidence, null, 2)}\n`);
    expect(JSON.parse(readFileSync(evidenceUrl, 'utf8'))).toEqual(evidence);
    const separatedUrl = new URL('../quality-9-request.json', import.meta.url);
    const separated = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality8-recorded.json',
      requests: [{ promptVersion: QUALITY9_PROMPT_VERSION, request: buildQuality9CompareRequest() }],
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(separatedUrl, `${JSON.stringify(separated, null, 2)}\n`);
    expect(JSON.parse(readFileSync(separatedUrl, 'utf8'))).toEqual(separated);
    const inputsUrl = new URL('../quality-9-inputs-request.json', import.meta.url);
    const inputs = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality9-recorded.json',
      requests: buildQuality9InputRequests(),
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(inputsUrl, `${JSON.stringify(inputs, null, 2)}\n`);
    expect(JSON.parse(readFileSync(inputsUrl, 'utf8'))).toEqual(inputs);
    expect(inputs.requests.map((item) => item.inputId)).toEqual(['brewery', 'experience', 'supplier']);
    expect(inputs.requests[1]?.request.messages[1]?.content).toContain(QUALITY9_EXPERIENCE_INPUT);
    expect(inputs.requests[1]?.request.messages[1]?.content).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(inputs.requests[2]?.request.messages[1]?.content).toContain(QUALITY9_SUPPLIER_INPUT);
    expect(inputs.requests[2]?.request.messages[1]?.content).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    const universalUrl = new URL('../quality-10-inputs-request.json', import.meta.url);
    const universal = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality9-inputs-recorded.json',
      requests: buildQuality10InputRequests(),
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(universalUrl, `${JSON.stringify(universal, null, 2)}\n`);
    expect(JSON.parse(readFileSync(universalUrl, 'utf8'))).toEqual(universal);
  });

  it('gives each quality-10 input its own question array and a full revenue string', () => {
    const brewery = quality10UserBlock(COMPARE_BUSINESS_INPUT);
    const experience = quality10UserBlock(QUALITY9_EXPERIENCE_INPUT);
    const supplier = quality10UserBlock(QUALITY9_SUPPLIER_INPUT);
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(buildQuality10CompareRequest().messages[0]?.content).toContain(QUALITY10_PROMPT_VERSION);
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY10_PROMPT_VERSION);
    expect(brewery).toContain('무엇을 먼저 검증할 것인가?');
    for (const choice of QUALITY6_BREWERY_CHOICES) expect(brewery).toContain(choice);
    expect(experience).toContain('막걸리 만들기체험에서 무엇을 먼저 확인할 것인가?');
    for (const choice of QUALITY10_EXPERIENCE_CHOICES) expect(experience).toContain(choice);
    expect(quality10Branch(QUALITY9_EXPERIENCE_INPUT).choices.join('')).not.toContain('마케팅');
    expect(quality10Branch(QUALITY9_EXPERIENCE_INPUT).choices.join('')).not.toContain('양조장');
    expect(supplier).toContain('온라인 마케팅 페이지 대행에서 무엇을 먼저 확인할 것인가?');
    for (const choice of QUALITY10_SUPPLIER_CHOICES) expect(supplier).toContain(choice);
    expect(quality10Branch(QUALITY9_SUPPLIER_INPUT).choices.join('')).not.toContain('관광객');
    expect(quality10Branch(QUALITY9_SUPPLIER_INPUT).choices.join('')).not.toContain('막걸리');
    for (const block of [brewery, experience, supplier]) {
      expect(block).toContain('choices는 배열만 쓴다');
      expect(block).toContain(quality7RevenueString(COMPARE_BUSINESS_INPUT));
      expect(block).toContain('한 항목으로 줄이지 않는다');
    }
    expect(quality10Branch(QUALITY9_EXPERIENCE_INPUT).choices).toEqual([...QUALITY10_EXPERIENCE_CHOICES]);
    expect(quality10Branch(QUALITY9_SUPPLIER_INPUT).choices).toEqual([...QUALITY10_SUPPLIER_CHOICES]);
    const stringChoices = analysisRaw(quality7RevenueString(COMPARE_BUSINESS_INPUT));
    const broken = JSON.parse(stringChoices) as { choices: unknown };
    broken.choices = '미확인';
    expect(parseSections(JSON.stringify(broken), COMPARE_BUSINESS_INPUT)).toBeNull();
    expect(reviewContractError(JSON.stringify(broken))).toBe('unstructured_response');
    const copied = quality11UserBlock(COMPARE_BUSINESS_INPUT);
    expect(copied).toContain(QUALITY11_PROMPT_VERSION);
    expect(copied).toContain('summary 값:\n관광객 대상 양조장 체험과 양조장 온라인 마케팅 지원을 함께 구상 중이다.');
    expect(copied).toContain('nextQuestion 값:\n무엇을 먼저 검증할 것인가?');
    expect(copied).toContain(`revenueModel 값:\n${quality7RevenueString(COMPARE_BUSINESS_INPUT)}`);
    expect(quality11UserBlock(QUALITY9_EXPERIENCE_INPUT)).toContain('막걸리 만들기체험에서 무엇을 먼저 확인할 것인가?');
    expect(quality11UserBlock(QUALITY9_EXPERIENCE_INPUT)).toContain('외국인 관광객에게 막걸리 만들기체험만 안내하는 구상이다.');
    expect(quality11UserBlock(QUALITY9_SUPPLIER_INPUT)).toContain('온라인 마케팅 페이지 대행에서 무엇을 먼저 확인할 것인가?');
    expect(quality11UserBlock(QUALITY9_SUPPLIER_INPUT)).toContain('지역 공장에 온라인 마케팅 페이지 제작만 대행하는 구상이다.');
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY11_PROMPT_VERSION);
    const retryUrl = new URL('../quality-11-inputs-request.json', import.meta.url);
    const retry = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality9-inputs-recorded.json',
      requests: buildQuality11InputRequests(),
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(retryUrl, `${JSON.stringify(retry, null, 2)}\n`);
    expect(JSON.parse(readFileSync(retryUrl, 'utf8'))).toEqual(retry);
    expect(buildQuality11CompareRequest(QUALITY9_EXPERIENCE_INPUT).messages[1]?.content).not.toContain(QUALITY6_BREWERY_CHOICES[1]);
    expect(buildQuality11CompareRequest(QUALITY9_SUPPLIER_INPUT).messages[1]?.content).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    const separated = quality12UserBlock(COMPARE_BUSINESS_INPUT);
    expect(separated).toContain(QUALITY12_PROMPT_VERSION);
    expect(separated).toContain('problem 값:\n미확인');
    expect(separated).toContain('strengths 값:\n["미확인"]');
    expect(separated).toContain(`revenueModel 값:\n${quality7RevenueString(COMPARE_BUSINESS_INPUT)}`);
    expect(quality12UserBlock(QUALITY9_EXPERIENCE_INPUT)).toContain('막걸리 만들기체험에서 무엇을 먼저 확인할 것인가?');
    expect(quality12UserBlock(QUALITY9_SUPPLIER_INPUT)).toContain('온라인 마케팅 페이지 대행에서 무엇을 먼저 확인할 것인가?');
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY12_PROMPT_VERSION);
    const lineUrl = new URL('../quality-12-inputs-request.json', import.meta.url);
    const lineFixture = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality11-inputs-recorded.json',
      requests: buildQuality12InputRequests(),
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(lineUrl, `${JSON.stringify(lineFixture, null, 2)}\n`);
    expect(JSON.parse(readFileSync(lineUrl, 'utf8'))).toEqual(lineFixture);
    expect(buildQuality12CompareRequest(QUALITY9_EXPERIENCE_INPUT).messages[1]?.content).not.toContain(QUALITY6_BREWERY_CHOICES[1]);
    expect(buildQuality12CompareRequest(QUALITY9_SUPPLIER_INPUT).messages[1]?.content).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
  });

  it('asks the product prompt with the business text and no prescribed answers', () => {
    const requests = buildIndependentInputRequests();
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(requests.map((item) => item.promptVersion)).toEqual(['quality-2:brewery', 'quality-2:experience', 'quality-2:supplier']);
    const prescribed = [
      ...QUALITY6_BREWERY_CHOICES,
      ...QUALITY10_EXPERIENCE_CHOICES,
      ...QUALITY10_SUPPLIER_CHOICES,
      quality7RevenueString(COMPARE_BUSINESS_INPUT),
      quality9Inference(COMPARE_BUSINESS_INPUT),
      'nextQuestion 값:',
      'revenueModel 값:',
    ];
    for (const item of requests) {
      const system = item.request.messages[0]?.content ?? '';
      const user = item.request.messages[1]?.content ?? '';
      expect(system).toContain('프롬프트 버전 quality-2');
      expect(system).not.toContain(QUALITY12_PROMPT_VERSION);
      expect(user).not.toContain(QUALITY12_PROMPT_VERSION);
      for (const line of prescribed) expect(user).not.toContain(line);
    }
    expect(requests[0]?.request.messages[1]?.content).toContain('양조장 체험');
    expect(requests[1]?.request.messages[1]?.content).toContain(QUALITY9_EXPERIENCE_INPUT);
    expect(requests[2]?.request.messages[1]?.content).toContain(QUALITY9_SUPPLIER_INPUT);
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).toContain('프롬프트 버전 quality-2');
    const openUrl = new URL('../quality-2-independent-request.json', import.meta.url);
    const openFixture = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality12-inputs-recorded.json',
      requests: buildIndependentInputRequests(),
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(openUrl, `${JSON.stringify(openFixture, null, 2)}\n`);
    expect(JSON.parse(readFileSync(openUrl, 'utf8'))).toEqual(openFixture);
  });

  it('keeps quality-13 on the business text and names the quality-2 gaps', () => {
    const product = buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content ?? '';
    expect(product).toContain('가능한 수익은 가설이라고 적는다');
    expect(product).toContain('불확실성이 가장 많이 줄어드는');
    expect(product).not.toContain('경력');
    expect(product).not.toContain('네트워크');
    expect(product).not.toContain('고객을 지불자로');
    expect(product).not.toContain('항목마다 가설:');
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');

    const requests = buildQuality13InputRequests();
    expect(requests.map((item) => item.promptVersion)).toEqual([
      'quality-13-cpo-draft:brewery',
      'quality-13-cpo-draft:experience',
      'quality-13-cpo-draft:supplier',
    ]);
    const banned = [
      ...QUALITY6_BREWERY_CHOICES,
      ...QUALITY10_EXPERIENCE_CHOICES,
      ...QUALITY10_SUPPLIER_CHOICES,
      quality7RevenueString(COMPARE_BUSINESS_INPUT),
      quality9Inference(COMPARE_BUSINESS_INPUT),
      'nextQuestion 값:',
    ].filter((line) => line !== '아직 우선순위를 결정하지 못함' && line !== '기타 / 직접 입력');
    expect(quality13UserBlock(COMPARE_BUSINESS_INPUT)).toContain(quality13DecisionCue('brewery'));
    expect(quality13UserBlock(QUALITY9_EXPERIENCE_INPUT)).toContain('다른 문화 체험을 더하지 않는다');
    expect(quality13UserBlock(QUALITY9_SUPPLIER_INPUT)).toContain('추가 상품을 더하지 않는다');
    expect(quality13UserBlock(QUALITY9_EXPERIENCE_INPUT)).not.toContain('마케팅 지원이 함께');
    for (const item of requests) {
      const user = item.request.messages[1]?.content ?? '';
      const system = item.request.messages[0]?.content ?? '';
      expect(system).toContain(QUALITY13_PROMPT_VERSION);
      expect(system).not.toContain('프롬프트 버전 quality-2');
      expect(user).toContain(QUALITY13_PROMPT_VERSION);
      for (const line of banned) expect(user).not.toContain(line);
    }
    const invented = JSON.parse(contractRaw(COMPARE_BUSINESS_INPUT)) as {
      founderFacts: string;
      payer: string;
      revenueModel: string;
    };
    invented.founderFacts = '창업자는 관광 및 주류 산업에 대한 경험이 있으며, 양조장과의 네트워크를 보유하고 있다.';
    invented.payer = '양조장 체험에 참여하는 관광객';
    invented.revenueModel = '체험 참가비, 양조장에서의 판매 수익 (가설)';
    expect(reviewContractError(JSON.stringify(invented))).toBeNull();
    const openUrl = new URL('../quality-13-independent-request.json', import.meta.url);
    const openFixture = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality2-independent-recorded.json',
      requests: buildQuality13InputRequests(),
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(openUrl, `${JSON.stringify(openFixture, null, 2)}\n`);
    expect(JSON.parse(readFileSync(openUrl, 'utf8'))).toEqual(openFixture);
    const retry = quality14UserBlock(QUALITY9_EXPERIENCE_INPUT);
    expect(retry).toContain(QUALITY14_PROMPT_VERSION);
    expect(retry).toContain('질문을 가르는 답을 둘 이상 둔다');
    expect(retry).not.toContain(QUALITY13_PROMPT_VERSION);
    for (const line of banned) expect(retry).not.toContain(line);
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY14_PROMPT_VERSION);
    const retryUrl = new URL('../quality-14-independent-request.json', import.meta.url);
    const retryFixture = {
      businessInput: COMPARE_BUSINESS_INPUT,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality2-independent-recorded.json',
      requests: buildQuality14InputRequests(),
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(retryUrl, `${JSON.stringify(retryFixture, null, 2)}\n`);
    expect(JSON.parse(readFileSync(retryUrl, 'utf8'))).toEqual(retryFixture);
  });

  it('accepts the same field contract on brewery, experience, and supplier inputs', () => {
    for (const text of [COMPARE_BUSINESS_INPUT, QUALITY9_EXPERIENCE_INPUT, QUALITY9_SUPPLIER_INPUT]) {
      const score = scoreBranchContract(contractRaw(text), text);
      expect(score.detail).toContain('파서 수용');
      expect(branchContractPass(score)).toBe(true);
    }
    const experienceQuestion = JSON.parse(contractRaw(QUALITY9_EXPERIENCE_INPUT)) as { nextQuestion: string };
    experienceQuestion.nextQuestion = '공급자 마케팅 지원을 먼저 확인할 것인가?';
    const wrongAxis = scoreBranchContract(JSON.stringify(experienceQuestion), QUALITY9_EXPERIENCE_INPUT);
    expect(wrongAxis.axisOk).toBe(false);
    expect(branchContractPass(wrongAxis)).toBe(false);

    const supplierChoices = JSON.parse(contractRaw(QUALITY9_SUPPLIER_INPUT)) as { choices: string[] };
    supplierChoices.choices = ['관광객 체험을 먼저 검증', ...supplierChoices.choices.slice(1)];
    expect(scoreBranchContract(JSON.stringify(supplierChoices), QUALITY9_SUPPLIER_INPUT).axisOk).toBe(false);

    const shortRevenue = JSON.parse(contractRaw(COMPARE_BUSINESS_INPUT)) as { revenueModel: string };
    shortRevenue.revenueModel = '가설: 체험 참가비';
    const shortScore = scoreBranchContract(JSON.stringify(shortRevenue), COMPARE_BUSINESS_INPUT);
    expect(shortScore.revenueOk).toBe(false);
    expect(shortScore.parserOk).toBe(true);

    const stringChoices = JSON.parse(contractRaw(QUALITY9_SUPPLIER_INPUT)) as { choices: unknown };
    stringChoices.choices = '미확인';
    expect(scoreBranchContract(JSON.stringify(stringChoices), QUALITY9_SUPPLIER_INPUT).parserOk).toBe(false);
    expect(reviewContractError(JSON.stringify(stringChoices))).toBe('unstructured_response');

    const choiceAsQuestion = JSON.parse(contractRaw(COMPARE_BUSINESS_INPUT)) as { nextQuestion: string };
    choiceAsQuestion.nextQuestion = QUALITY6_BREWERY_CHOICES[0];
    expect(scoreBranchContract(JSON.stringify(choiceAsQuestion), COMPARE_BUSINESS_INPUT).questionOk).toBe(false);

    const namedPayer = JSON.parse(contractRaw(QUALITY9_EXPERIENCE_INPUT)) as { payer: string };
    namedPayer.payer = '외국인 관광객';
    expect(scoreBranchContract(JSON.stringify(namedPayer), QUALITY9_EXPERIENCE_INPUT).payerOk).toBe(false);

    const brewery = contractRaw(COMPARE_BUSINESS_INPUT);
    const gates = scoreSprintGates(brewery, COMPARE_BUSINESS_INPUT);
    expect(gates.find((item) => item.id === 'Q1')?.status).toBe('pass');
    expect(gates.find((item) => item.id === 'Q5')?.status).toBe('pass');
    expect(gates.find((item) => item.id === 'Q6')?.status).toBe('pass');
    expect(scoreRevenueContract(brewery, COMPARE_BUSINESS_INPUT).itemsOk).toBe(true);
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');

    const omitted = JSON.parse(contractRaw(COMPARE_BUSINESS_INPUT)) as Record<string, unknown>;
    delete omitted.problem;
    delete omitted.value;
    delete omitted.strengths;
    delete omitted.nextQuestionReason;
    delete omitted.market;
    const restored = parseSections(JSON.stringify(omitted), COMPARE_BUSINESS_INPUT);
    expect(restored?.problem).toBe('미확인');
    expect(restored?.nextQuestion).toBe('무엇을 먼저 검증할 것인가?');
    expect(restored?.analysis?.strengths).toEqual(['미확인']);
    expect(restored?.revenueModel).toBe(quality7RevenueString(COMPARE_BUSINESS_INPUT));
    expect(branchContractPass(scoreBranchContract(JSON.stringify(omitted), COMPARE_BUSINESS_INPUT))).toBe(true);
    const missingQuestion = JSON.parse(contractRaw(QUALITY9_EXPERIENCE_INPUT)) as Record<string, unknown>;
    delete missingQuestion.nextQuestion;
    expect(parseSections(JSON.stringify(missingQuestion), QUALITY9_EXPERIENCE_INPUT)).toBeNull();
    const objectRevenue = JSON.parse(contractRaw(QUALITY9_SUPPLIER_INPUT)) as { revenueModel: unknown };
    objectRevenue.revenueModel = { fee: '가설' };
    expect(reviewContractError(JSON.stringify(objectRevenue))).toBe('revenue_model_type');
    expect(parseSections(JSON.stringify(objectRevenue), QUALITY9_SUPPLIER_INPUT)).toBeNull();
  });

  it('keeps quality-9 inferences from copying founder sentences', () => {
    const request = buildQuality9CompareRequest();
    const user = request.messages[1]?.content ?? '';
    const system = request.messages[0]?.content ?? '';
    const inference = quality9Inference(COMPARE_BUSINESS_INPUT);
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(system).toContain(QUALITY9_PROMPT_VERSION);
    expect(system).not.toContain(QUALITY8_PROMPT_VERSION);
    expect(user).toContain(QUALITY9_PROMPT_VERSION);
    expect(user).not.toContain(QUALITY8_PROMPT_VERSION);
    expect(user).toContain(inference);
    expect(user).not.toContain('founderFacts의 문장 하나를 그대로 포함');
    expect(user).toContain(quality7RevenueString(COMPARE_BUSINESS_INPUT));
    for (const choice of QUALITY6_BREWERY_CHOICES) expect(user).toContain(choice);
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY9_PROMPT_VERSION);

    const experienceOnly = '외국인 관광객에게 막걸리 만들기체험만 안내한다.';
    const supportOnly = '양조장 온라인 마케팅 페이지 제작만 대행한다.';
    expect(quality9Inference(experienceOnly)).toBe('미확인');
    expect(quality9Inference(supportOnly)).toBe('미확인');
    expect(quality9EvidenceBlock(experienceOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(quality7UserBlock(supportOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);

    const facts = quality8FounderFacts(COMPARE_BUSINESS_INPUT);
    const copied = JSON.parse(analysisRaw(quality7RevenueString(COMPARE_BUSINESS_INPUT))) as { inferences: string[] };
    copied.inferences = [`추론: ${facts[0]}`];
    expect(scoreInferenceSeparation(JSON.stringify(copied), COMPARE_BUSINESS_INPUT).separated).toBe(false);
    const distinct = JSON.parse(analysisRaw(quality7RevenueString(COMPARE_BUSINESS_INPUT))) as {
      founderFacts: string[];
      strengths: string[];
      inferences: string[];
    };
    distinct.founderFacts = facts;
    distinct.strengths = ['미확인'];
    distinct.inferences = [inference];
    const distinctRaw = JSON.stringify(distinct);
    expect(scoreInferenceSeparation(distinctRaw, COMPARE_BUSINESS_INPUT).separated).toBe(true);
    expect(scoreEvidenceIntegrity(distinctRaw, COMPARE_BUSINESS_INPUT).founderFactsOk).toBe(true);
    expect(reviewContractError(distinctRaw)).toBeNull();
    expect(parseSections(distinctRaw, COMPARE_BUSINESS_INPUT)?.revenueModel).toContain('가설: 체험 참가비');
  });

  it('keeps quality-8 founder facts inside the input and the brewery choices on the two-axis input', () => {
    const request = buildQuality8CompareRequest();
    const system = request.messages[0]?.content ?? '';
    const user = request.messages[1]?.content ?? '';
    const facts = quality8FounderFacts(COMPARE_BUSINESS_INPUT);
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(system).toContain(QUALITY8_PROMPT_VERSION);
    expect(system).not.toContain(QUALITY7_PROMPT_VERSION);
    expect(user).toContain(QUALITY8_PROMPT_VERSION);
    expect(user).not.toContain(QUALITY7_PROMPT_VERSION);
    expect(user).toContain(quality7RevenueString(COMPARE_BUSINESS_INPUT));
    expect(user).toContain('revenueModel의 JSON 타입은 string이다.');
    for (const fact of facts) expect(user).toContain(fact);
    expect(user).toContain('["미확인"]');
    expect(user).toContain('추론:');
    for (const choice of QUALITY6_BREWERY_CHOICES) expect(user).toContain(choice);
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY8_PROMPT_VERSION);

    const experienceOnly = '외국인 관광객에게 막걸리 만들기체험만 안내한다.';
    const supportOnly = '양조장 온라인 마케팅 페이지 제작만 대행한다.';
    expect(quality8EvidenceBlock(experienceOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(quality7UserBlock(experienceOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(quality7UserBlock(supportOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(quality8FounderFacts(experienceOnly).join('')).not.toContain('산업 경험');
    expect(quality8EvidenceBlock('우리 강점은 양조장 세 곳과 이미 이야기했다.')).toContain('강점이라고 적은 문장만');

    const honest = analysisRaw(quality7RevenueString(COMPARE_BUSINESS_INPUT));
    const honestParsed = JSON.parse(honest) as { founderFacts: string[]; strengths: string[]; inferences: string[] };
    honestParsed.founderFacts = facts;
    honestParsed.strengths = ['미확인'];
    honestParsed.inferences = [`추론: ${facts[0]}`];
    const honestRaw = JSON.stringify(honestParsed);
    const integrity = scoreEvidenceIntegrity(honestRaw, COMPARE_BUSINESS_INPUT);
    expect(integrity.founderFactsOk).toBe(true);
    expect(integrity.strengthsOk).toBe(true);
    expect(integrity.inferencesOk).toBe(true);
    expect(scoreRevenueContract(honestRaw, COMPARE_BUSINESS_INPUT).itemsOk).toBe(true);
    expect(reviewContractError(honestRaw)).toBeNull();
    expect(parseSections(honestRaw, COMPARE_BUSINESS_INPUT)?.revenueModel).toContain('가설: 체험 참가비');

    const invented = JSON.parse(honestRaw) as { founderFacts: string[]; strengths: string[]; inferences: string[] };
    invented.founderFacts = ['관광 및 주류 산업 경험', '마케팅 및 운영 관리 능력'];
    invented.strengths = ['전통주에 대한 관심 증가'];
    invented.inferences = ['체험과 마케팅 지원의 결합이 시너지 효과를 낼 가능성'];
    const inventedScore = scoreEvidenceIntegrity(JSON.stringify(invented), COMPARE_BUSINESS_INPUT);
    expect(inventedScore.founderFactsOk).toBe(false);
    expect(inventedScore.strengthsOk).toBe(false);
    expect(inventedScore.inferencesOk).toBe(false);
    expect(reviewContractError('not-json')).toBe('invalid_json');
    expect(reviewContractError('{"summary":"없다"}')).toBe('unstructured_response');
  });

  it('keeps quality-7 revenue as a string and rejects the quality-6 object', async () => {
    const brewery = buildQuality7CompareRequest();
    const system = brewery.messages[0]?.content ?? '';
    const user = brewery.messages[1]?.content ?? '';
    const revenue = quality7RevenueString(COMPARE_BUSINESS_INPUT);
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(system).toBe(QUALITY7_SYSTEM_PROMPT);
    expect(system).toContain('revenueModel의 JSON 타입은 string이다.');
    expect(user).toContain('revenueModel의 JSON 타입은 string이다.');
    expect(user).toContain(revenue);
    expect(revenue.split('가설:').length - 1).toBe(4);
    for (const choice of QUALITY6_BREWERY_CHOICES) expect(user).toContain(choice);
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(QUALITY7_PROMPT_VERSION);

    const experienceOnly = '외국인 관광객에게 막걸리 만들기체험만 안내한다.';
    const supportOnly = '양조장 온라인 마케팅 페이지 제작만 대행한다.';
    const unpaid = '동네 빵집 단골에게 빵을 만들어 준다. 누가 내는지는 아직 없다.';
    const stated = `${COMPARE_BUSINESS_INPUT}\n체험 참가비는 1인 3만원으로 정했다.`;
    expect(quality7UserBlock(experienceOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(quality7UserBlock(supportOnly)).not.toContain(QUALITY6_BREWERY_CHOICES[0]);
    expect(quality7UserBlock(unpaid)).toContain('payer는 미확인');
    expect(quality7RevenueString(stated)).toContain('사실: 체험 참가비');
    expect(quality7RevenueString(stated)).toContain('가설: 수수료');
    expect(quality7RevenueString(stated)).toContain('가설: 마케팅 서비스 수수료');

    const accepted = analysisRaw(revenue);
    expect(reviewContractError(accepted)).toBeNull();
    expect(parseSections(accepted, COMPARE_BUSINESS_INPUT)?.revenueModel).toBe(revenue);
    expect(scoreRevenueContract(accepted, COMPARE_BUSINESS_INPUT).itemsOk).toBe(true);

    const objectRaw = analysisRaw({ '체험 수익': '양조장 체험을 통한 수익', '가설: 온라인 마케팅 서비스 수수료': '마케팅 지원 수익' });
    expect(reviewContractError(objectRaw)).toBe('revenue_model_type');
    expect(parseSections(objectRaw, COMPARE_BUSINESS_INPUT)).toBeNull();
    expect(scoreRevenueContract(objectRaw, COMPARE_BUSINESS_INPUT).typeOk).toBe(false);
    expect(reviewContractError('{"summary":"없다"}')).toBe('unstructured_response');
    expect(reviewContractError('not-json')).toBe('invalid_json');

    const refused = presentReview(stored('review-object', 'failed', null, objectRaw, 'revenue_model_type'), [], []);
    expect(refused.status).toBe('failed');
    expect(refused.sections).toBeNull();
    expect(refused.failure).toBe('revenue_model_type');
    expect(reviewFailureCopy(refused.failure)).toContain('문자열이 아니어서');

    const sections = parseSections(accepted, COMPARE_BUSINESS_INPUT);
    const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'ai-pm-q7-')), 'reviews.sqlite'));
    await store.insertReview(stored('review-string', 'succeeded', sections, accepted, null));
    const reread = await store.listReviews('user-a', 'project-test');
    expect(reread).toHaveLength(1);
    expect(reread[0]?.sections?.revenueModel).toBe(revenue);
    expect(reread[0]?.status).toBe('succeeded');
    store.close();
  });

  it('composes a second incremental call from the brewery reply and a synthetic answer', () => {
    const evidenceUrl = new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json', import.meta.url);
    const evidence = JSON.parse(readFileSync(evidenceUrl, 'utf8')) as {
      gitSha: string;
      report: { calls: Array<{ promptVersion: string; raw: string }> };
    };
    const previous = evidence.report.calls.find((call) => call.promptVersion === 'quality-14-cpo-draft:brewery');
    expect(previous?.raw).toContain(INCREMENTAL_STRUCTURE_CHOICE);
    const request = buildIncrementalStructureRequest({
      originalInput: COMPARE_BUSINESS_INPUT,
      previousAnalysisRaw: previous?.raw ?? '',
      previousAnalysisSource: {
        evidence: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json',
        promptVersion: 'quality-14-cpo-draft:brewery',
        executionSha: evidence.gitSha,
      },
    });
    const coverage = incrementalStructureCoverage(request);
    expect(coverage).toEqual({
      originalInput: true,
      previousAnalysis: true,
      previousQuestion: true,
      founderChoice: true,
      founderSupplement: true,
      separationRules: true,
    });
    expect(incrementalStructureReady(request)).toBe(true);
    const user = JSON.parse(request.messages[1]?.content ?? '{}') as {
      dataClass: string;
      notice: string;
      originalInput: string;
      previousQuestion: string;
      previousAnalysis: { nextQuestion: string; choices: string[] };
      founderChoice: { label: string; dataClass: string; notice: string };
      founderSupplement: string;
      previousAnalysisSource: { executionSha: string; note: string };
    };
    expect(user.dataClass).toBe(INCREMENTAL_STRUCTURE_DATA_CLASS);
    expect(user.notice).toBe(INCREMENTAL_STRUCTURE_NOTICE);
    expect(user.originalInput).toBe(COMPARE_BUSINESS_INPUT);
    expect(user.previousQuestion).toBe('체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?');
    expect(user.previousQuestion).toBe(user.previousAnalysis.nextQuestion);
    expect(user.previousAnalysis.choices).toContain(INCREMENTAL_STRUCTURE_CHOICE);
    expect(user.founderChoice.label).toBe(INCREMENTAL_STRUCTURE_CHOICE);
    expect(user.founderChoice.dataClass).toBe(INCREMENTAL_STRUCTURE_DATA_CLASS);
    expect(user.founderChoice.notice).toBe(INCREMENTAL_STRUCTURE_NOTICE);
    expect(user.founderSupplement).toBe(INCREMENTAL_STRUCTURE_SUPPLEMENT);
    expect(user.previousAnalysisSource.executionSha).toBe('8c5968ed6023f04bfa2172884ddaf4a47c02127a');
    expect(user.previousAnalysisSource.note).toContain('품질 통과가 아니다');
    expect(request.messages[0]?.content).toContain(INCREMENTAL_STRUCTURE_VERSION);
    expect(request.messages[0]?.content).not.toContain('프롬프트 버전 quality-2');
    expect(request.maxTokens).toBe(2400);
    expect(buildFirstReviewRequest(COMPARE_BUSINESS_INPUT).messages[0]?.content).not.toContain(INCREMENTAL_STRUCTURE_VERSION);
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(() =>
      buildIncrementalStructureRequest({
        originalInput: COMPARE_BUSINESS_INPUT,
        previousAnalysisRaw: previous?.raw ?? '',
        previousAnalysisSource: {
          evidence: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json',
          promptVersion: 'quality-14-cpo-draft:brewery',
          executionSha: evidence.gitSha,
        },
        founderChoiceLabel: '실제 창업자가 고르지 않은 선택',
      }),
    ).toThrow('incremental_choice_not_in_previous');

    const product = buildFollowUpRequest({
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
        nextQuestion: user.previousQuestion,
        nextQuestionReason: '갈림길',
        answerHint: '',
        claimConfirmation: null,
      },
      feedback: {
        feedbackId: 'feedback-synthetic',
        reviewId: 'review-synthetic',
        userId: 'user-synthetic',
        agreement: 'need_info',
        accuracy: 'hard_to_compare',
        revisionAreas: ['other'],
        comment: INCREMENTAL_STRUCTURE_CHOICE,
        nextAction: 'verify_hypotheses',
        marks: [],
        choiceAnswer: { choiceId: 'choice-1', label: INCREMENTAL_STRUCTURE_CHOICE, otherText: INCREMENTAL_STRUCTURE_SUPPLEMENT },
        submittedAt: '2026-10-29T09:20:00.000Z',
        modelCalls: 0,
      },
      supplement: INCREMENTAL_STRUCTURE_SUPPLEMENT,
      answerOrigin: 'synthetic-test-data',
    });
    expect(productFollowUpStructureReport(product)).toEqual({
      present: ['originalInput', 'previousAnalysis', 'previousQuestion', 'founderChoice', 'founderSupplement', 'separationRules'],
      absent: [],
    });
    expect(followUpStructureCoverage(product).answerOrigin).toBe(true);
    expect(followUpStructureCoverage(product).founderChoice).toBe(true);
    const productUser = JSON.parse(product.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      answerOrigin: string;
      founderChoice: { label: string; answerOrigin: string };
      previousAnalysis: { analysis: null; judgment: string };
    };
    expect(productUser.answerOrigin).toBe('synthetic-test-data');
    expect(productUser.founderChoice.label).toBe(INCREMENTAL_STRUCTURE_CHOICE);
    expect(productUser.founderChoice.answerOrigin).toBe('synthetic-test-data');
    expect(productUser.previousAnalysis.analysis).toBeNull();
    expect(productUser.previousAnalysis.judgment).toBe('보류');
    expect(product.messages.map((message) => message.content).join('\n')).not.toContain(INCREMENTAL_STRUCTURE_VERSION);

    const reviewSource = readFileSync(new URL('../ai-pm-review.ts', import.meta.url), 'utf8');
    const saveStart = reviewSource.indexOf('export async function saveReviewFeedback');
    const saveEnd = reviewSource.indexOf('export async function runFollowUpReview');
    const saveSource = reviewSource.slice(saveStart, saveEnd);
    expect(saveSource).toContain('modelCalls: 0');
    expect(saveSource).not.toContain('chat(');
    expect(saveSource).not.toContain('buildIncrementalStructureRequest');
    expect(saveSource).not.toContain('buildFollowUpRequest');
    const followStart = reviewSource.indexOf('export async function runFollowUpReview');
    const followEnd = reviewSource.indexOf('export function needsRevisionGate');
    const followSource = reviewSource.slice(followStart, followEnd);
    expect(followSource).toContain('buildFollowUpRequest');
    expect(followSource).toContain("answerOrigin: 'founder-input'");
    expect(followSource).not.toContain('buildIncrementalStructureRequest');
    const panel = readFileSync(new URL('../../components/ai-pm-review-panel.tsx', import.meta.url), 'utf8');
    const followRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/follow-up/route.ts', import.meta.url), 'utf8');
    expect(panel).not.toContain('/api/ai-pm-review/follow-up');
    expect(panel).not.toContain('buildIncrementalStructureRequest');
    expect(panel).toContain('답을 저장했습니다. 모델 호출은 없습니다.');
    expect(followRoute).toContain('runFollowUpReview');
    expect(followRoute).not.toContain('buildIncrementalStructureRequest');
    const script = readFileSync(new URL('../../../../scripts/preview-quality-compare-once.mjs', import.meta.url), 'utf8');
    expect(script).not.toContain('buildIncrementalStructureRequest');
    expect(script).toContain('productFollowUpInvoked: false');

    const changed = incrementalFieldDelta(
      JSON.stringify({ judgment: '미확인', assumptions: '미확인', nextVerification: '미확인' }),
      JSON.stringify({ judgment: '체험을 먼저 본다', assumptions: '가설: 체험 우선', nextVerification: '체험 수요' }),
    );
    expect(changed).toEqual({
      parsed: true,
      sameDocument: false,
      judgmentChanged: true,
      assumptionsChanged: true,
      priorityChanged: true,
    });
    const same = incrementalFieldDelta('{"judgment":"미확인"}', '{"judgment":"미확인"}');
    expect(same.sameDocument).toBe(true);
    expect(same.judgmentChanged).toBe(false);
    expect(incrementalFieldDelta('not-json', 'also-not').parsed).toBe(false);

    const fixtureUrl = new URL('../incremental-structure-request.json', import.meta.url);
    const fixture = {
      businessInput: COMPARE_BUSINESS_INPUT,
      dataClass: INCREMENTAL_STRUCTURE_DATA_CLASS,
      notice: INCREMENTAL_STRUCTURE_NOTICE,
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json',
      confounders: [
        {
          id: 'call_path',
          detail:
            'Preview build reads this frozen JSON and calls the model directly. It does not call /api/ai-pm-review/follow-up. productFollowUpInvoked false is not a Q10 pass.',
        },
        { id: 'data_class', detail: INCREMENTAL_STRUCTURE_NOTICE },
        {
          id: 'product_composer',
          detail:
            'This frozen file is the earlier direct call. The product composer is a separate request object and this script does not send it.',
        },
      ],
      requests: [
        {
          inputId: 'brewery',
          promptVersion: `${INCREMENTAL_STRUCTURE_VERSION}:brewery`,
          request,
        },
      ],
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(fixtureUrl, `${JSON.stringify(fixture, null, 2)}\n`);
    expect(JSON.parse(readFileSync(fixtureUrl, 'utf8'))).toEqual(fixture);
  });

  it('sends the stored product request on a separate reflection run and records field changes without a pass', () => {
    const product = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-product-follow-up-request.json', import.meta.url), 'utf8'),
    ) as { modelInvoked: boolean; request: { maxTokens: number; messages: Array<{ role: string; content: string }> } };
    const fixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-request.json', import.meta.url), 'utf8'),
    ) as {
      priorRunId: string;
      analysisContract: string;
      requests: Array<{ promptVersion: string; request: unknown }>;
    };
    expect(product.modelInvoked).toBe(false);
    expect(fixture.priorRunId).toBe('q1-incremental-structure-2026-10-29');
    expect(fixture.analysisContract).toBe('parsed-sections-1');
    expect(fixture.requests[0]?.promptVersion).toBe('parsed-sections-1:incremental-reflection:brewery');
    const historicalRequest = fixture.requests[0]?.request as { maxTokens: number; messages: Array<{ role: string; content: string }> };
    expect(historicalRequest.maxTokens).toBe(800);
    expect(historicalRequest).not.toEqual(product.request);
    const outputFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-output-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(outputFixture.priorRunId).toBe('q1-incremental-reflection-2026-10-29');
    expect(outputFixture.outputContract).toBe('reflection-output-1');
    expect(outputFixture.requests[0]?.promptVersion).toBe('reflection-output-1:brewery');
    expect(outputFixture.requests[0]?.request).not.toEqual(product.request);
    const arrayFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-array-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(arrayFixture.priorRunId).toBe('q1-incremental-reflection-output-2026-10-29');
    expect(arrayFixture.outputContract).toBe('reflection-output-2');
    expect(arrayFixture.requests[0]?.promptVersion).toBe('reflection-output-2:brewery');
    expect(arrayFixture.requests[0]?.request).not.toEqual(product.request);
    const groundsFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-grounds-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(groundsFixture.priorRunId).toBe('q1-incremental-reflection-array-2026-10-29');
    expect(groundsFixture.outputContract).toBe('reflection-output-3');
    expect(groundsFixture.requests[0]?.promptVersion).toBe('reflection-output-3:brewery');
    expect(groundsFixture.requests[0]?.request).not.toEqual(product.request);
    const sourceFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-source-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(sourceFixture.priorRunId).toBe('q1-incremental-reflection-grounds-2026-10-29');
    expect(sourceFixture.outputContract).toBe('reflection-output-4');
    expect(sourceFixture.requests[0]?.promptVersion).toBe('reflection-output-4:brewery');
    expect(sourceFixture.requests[0]?.request).not.toEqual(product.request);
    const traceFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-trace-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(traceFixture.priorRunId).toBe('q1-incremental-reflection-source-2026-10-29');
    expect(traceFixture.outputContract).toBe('reflection-output-5');
    expect(traceFixture.requests[0]?.promptVersion).toBe('reflection-output-5:brewery');
    expect(traceFixture.requests[0]?.request).not.toEqual(product.request);
    const reasonFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-reason-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(reasonFixture.priorRunId).toBe('q1-incremental-reflection-trace-2026-10-29');
    expect(reasonFixture.outputContract).toBe('reflection-output-6');
    expect(reasonFixture.requests[0]?.promptVersion).toBe('reflection-output-6:brewery');
    expect(reasonFixture.requests[0]?.request).not.toEqual(product.request);
    const preserveFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-preserve-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(preserveFixture.priorRunId).toBe('q1-incremental-reflection-reason-2026-10-29');
    expect(preserveFixture.outputContract).toBe('reflection-output-7');
    expect(preserveFixture.requests[0]?.promptVersion).toBe('reflection-output-7:brewery');
    expect(preserveFixture.requests[0]?.request).not.toEqual(product.request);
    const elementFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-element-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(elementFixture.priorRunId).toBe('q1-incremental-reflection-preserve-2026-10-29');
    expect(elementFixture.outputContract).toBe('reflection-output-8');
    expect(elementFixture.requests[0]?.promptVersion).toBe('reflection-output-8:brewery');
    expect(elementFixture.requests[0]?.request).not.toEqual(product.request);
    const linkFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-link-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(linkFixture.priorRunId).toBe('q1-incremental-reflection-element-2026-10-29');
    expect(linkFixture.outputContract).toBe('reflection-output-9');
    expect(linkFixture.requests[0]?.promptVersion).toBe('reflection-output-9:brewery');
    expect(linkFixture.requests[0]?.request).not.toEqual(product.request);
    const questionFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-question-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(questionFixture.priorRunId).toBe('q1-incremental-reflection-link-2026-10-29');
    expect(questionFixture.outputContract).toBe('reflection-output-10');
    expect(questionFixture.requests[0]?.promptVersion).toBe('reflection-output-10:brewery');
    expect(questionFixture.requests[0]?.request).not.toEqual(product.request);
    const normalizeFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-normalize-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; outputContract: string; requests: Array<{ promptVersion: string; request: unknown }> };
    expect(normalizeFixture.priorRunId).toBe('q1-incremental-reflection-question-2026-10-29');
    expect(normalizeFixture.outputContract).toBe('reflection-output-11');
    expect(normalizeFixture.requests[0]?.promptVersion).toBe('reflection-output-11:brewery');
    expect(normalizeFixture.requests[0]?.request).not.toEqual(product.request);
    const reasonQualityUrl = new URL('../incremental-reflection-reason-quality-request.json', import.meta.url);
    const reasonQualityFixture = JSON.parse(readFileSync(reasonQualityUrl, 'utf8')) as {
      priorRunId: string;
      outputContract: string;
      requests: Array<{ promptVersion: string; request: unknown }>;
    };
    expect(reasonQualityFixture.priorRunId).toBe('q1-incremental-reflection-normalize-2026-10-30');
    expect(reasonQualityFixture.outputContract).toBe('reflection-output-11');
    expect(reasonQualityFixture.requests[0]?.promptVersion).toBe('reflection-output-11:brewery');
    expect(reasonQualityFixture.requests[0]?.request).not.toEqual(product.request);
    const reviewFieldsUrl = new URL('../incremental-reflection-review-fields-request.json', import.meta.url);
    const reviewFieldsFixture = JSON.parse(readFileSync(reviewFieldsUrl, 'utf8')) as {
      priorRunId: string;
      outputContract: string;
      requests: Array<{ promptVersion: string; request: unknown }>;
    };
    expect(reviewFieldsFixture.priorRunId).toBe('q1-incremental-reflection-reason-quality-2026-10-30');
    expect(reviewFieldsFixture.outputContract).toBe('reflection-output-11');
    expect(reviewFieldsFixture.requests[0]?.promptVersion).toBe('reflection-output-11:brewery');
    expect(reviewFieldsFixture.requests[0]?.request).not.toEqual(product.request);
    const user = JSON.parse(historicalRequest.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      previousAnalysis: Record<string, unknown>;
      founderChoice: { label: string };
      answerOrigin: string;
    };
    expect(user.answerOrigin).toBe('synthetic-test-data');
    const choice = user.founderChoice.label;
    const denied = observeIncrementalReflection({
      previousAnalysis: user.previousAnalysis,
      choiceLabel: choice,
      nextRaw: JSON.stringify({
        judgment: '체험을 먼저 보겠다는 현재 판단이 있다. 예약 고객, 가격, 계약, 확정된 양조장은 없다.',
        hypotheses: ['가설: 체험을 먼저 검증한다는 계획은 아직 확인되지 않았다.'],
        nextVerification: '확정된 양조장이 있는지부터 확인한다.',
        nextQuestion: '체험을 열 양조장이 정해져 있습니까?',
        founderFacts: user.previousAnalysis && typeof user.previousAnalysis.analysis === 'object'
          ? (user.previousAnalysis.analysis as { founderFacts?: string[] }).founderFacts
          : [],
      }),
    });
    expect(denied.parsed).toBe(true);
    expect(denied.defects).toEqual([]);
    expect(denied.fields.map((field) => field.state)).toEqual(['changed', 'changed', 'changed', 'changed']);
    const strengthened = observeIncrementalReflection({
      previousAnalysis: user.previousAnalysis,
      choiceLabel: choice,
      nextRaw: JSON.stringify({
        judgment: '체험 수요가 확인되었다.',
        hypotheses: ['미확인'],
        nextVerification: '체험 프로그램의 수요 검증 및 온라인 마케팅 효과 검증',
        nextQuestion: '체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?',
        hypothesisChange: '체험 프로그램의 수요에 대한 가설이 강화되었다.',
        founderFacts: [choice, '예약 고객이 있다.'],
      }),
    });
    expect(strengthened.defects).toEqual([
      'hypothesis_strengthened',
      'choice_in_founder_facts',
      'supplement_in_founder_facts',
      'reserved_customers_asserted',
    ]);
    expect(strengthened.fields.find((field) => field.field === 'hypotheses')?.state).toBe('unchanged');
    expect(strengthened.fields.find((field) => field.field === 'nextQuestion')?.state).toBe('unchanged');
    const shortKeys = observeIncrementalReflection({
      previousAnalysis: user.previousAnalysis,
      choiceLabel: choice,
      nextRaw: JSON.stringify({ problem: '미확인', nextQuestion: '양조장이 정해져 있습니까?' }),
    });
    expect(shortKeys.fields.find((field) => field.field === 'judgment')?.state).toBe('absent');
    expect(shortKeys.fields.find((field) => field.field === 'nextQuestion')?.state).toBe('changed');
    expect(shortKeys.defects).not.toContain('pass');
    const droppedHypothesis = observeIncrementalReflection({
      previousAnalysis: user.previousAnalysis,
      choiceLabel: choice,
      nextRaw: JSON.stringify({ business_model: '체험 프로그램 참가비 및 관련 상품 판매 수익', nextQuestion: '다른 질문인가?' }),
    });
    expect(droppedHypothesis.defects).toContain('hypothesis_label_removed');
    const recorded = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-recorded.json', import.meta.url), 'utf8'),
    ) as {
      runId: string;
      priorRunId: string;
      status: string;
      gitSha: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      maxTokens: number;
      report: { calls: Array<{ status: string; promptVersion: string; userPrompt: string; raw: string }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-2026-10-29');
    expect(recorded.priorRunId).toBe('q1-incremental-structure-2026-10-29');
    expect(recorded.status).toBe('RECORDED');
    expect(recorded.gitSha).toBe('1f153fc754fc50533351593d40768949de951f91');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.reflectionScored).toBe(false);
    expect(recorded.maxTokens).toBe(800);
    const call = recorded.report.calls[0];
    expect(call?.status).toBe('succeeded');
    expect(call?.promptVersion).toBe('parsed-sections-1:incremental-reflection:brewery');
    const sent = JSON.parse(call?.userPrompt ?? '{}') as {
      analysisContract: string;
      answerOrigin: string;
      previousAnalysis: Record<string, unknown> & { analysis: { nextVerification: string }; revenueModel: string };
      founderChoice: { label: string };
    };
    expect(sent.analysisContract).toBe('parsed-sections-1');
    expect(sent.answerOrigin).toBe('synthetic-test-data');
    const live = observeIncrementalReflection({
      previousAnalysis: sent.previousAnalysis,
      choiceLabel: sent.founderChoice.label,
      nextRaw: call?.raw ?? '',
    });
    expect(live.parsed).toBe(true);
    expect(live.fields.map((field) => [field.field, field.state])).toEqual([
      ['judgment', 'absent'],
      ['hypotheses', 'absent'],
      ['nextVerification', 'absent'],
      ['nextQuestion', 'changed'],
    ]);
    expect(live.defects).toEqual(['hypothesis_label_removed']);
    const returned = JSON.parse(call?.raw ?? '{}') as { validation_metric: string; business_model: string };
    expect(returned.validation_metric).toBe(sent.previousAnalysis.analysis.nextVerification);
    expect(sent.previousAnalysis.revenueModel.includes('가설')).toBe(true);
    expect(returned.business_model.includes('가설')).toBe(false);
    expect(call?.raw ?? '').not.toContain(sent.founderChoice.label);
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

  it('freezes two input-trace requests that separate an empty supplement from a brewery claim', () => {
    const evidence = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json', import.meta.url), 'utf8'),
    ) as { businessInput: string; report: { calls: Array<{ promptVersion: string; raw: string }> } };
    const previousRaw = evidence.report.calls.find((call) => call.promptVersion === 'quality-14-cpo-draft:brewery');
    const parsed = parseSections(previousRaw?.raw ?? '', evidence.businessInput);
    expect(parsed?.analysis?.choices.length).toBeGreaterThan(0);
    const selected = parsed?.analysis?.choices.find((choice) => choice.label === '체험 프로그램을 먼저 검증할 것');
    expect(selected?.id).toBeTruthy();
    const feedback = {
      feedbackId: 'feedback-trace',
      reviewId: 'review-trace',
      userId: 'user-trace',
      agreement: 'need_info' as const,
      accuracy: 'hard_to_compare' as const,
      revisionAreas: ['other' as const],
      comment: selected?.label ?? '',
      nextAction: 'verify_hypotheses' as const,
      marks: [],
      choiceAnswer: { choiceId: selected?.id ?? '', label: selected?.label ?? '', otherText: '' },
      submittedAt: '2026-10-30T08:00:00.000Z',
      modelCalls: 0 as const,
    };
    const caseA = buildFollowUpRequest({
      originalInput: evidence.businessInput,
      sections: parsed!,
      feedback,
      supplement: '',
      answerOrigin: 'synthetic-test-data',
    });
    const caseB = buildFollowUpRequest({
      originalInput: evidence.businessInput,
      sections: parsed!,
      feedback,
      supplement: FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM,
      answerOrigin: 'synthetic-test-data',
    });
    const systemA = caseA.messages.find((message) => message.role === 'system')?.content ?? '';
    const systemB = caseB.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(systemA).not.toContain(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(systemB).not.toContain(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(systemA).not.toContain('양조장 후보가 있는가?');
    const userA = JSON.parse(caseA.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      founderSupplement: string;
      inputLedger: Array<{ id: string; kind: string }>;
    };
    const userB = JSON.parse(caseB.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      founderSupplement: string;
      inputLedger: Array<{ id: string; kind: string }>;
    };
    expect(userA.founderSupplement).toBe('');
    expect(userA.inputLedger.find((entry) => entry.id === 'founderSupplement')?.kind).toBe('absent');
    expect(userB.founderSupplement).toContain('확정되었');
    expect(userB.inputLedger.find((entry) => entry.id === 'founderSupplement')?.kind).toBe('unverified-claim');
    expect(caseA).not.toEqual(caseB);
    const fixtureUrl = new URL('../incremental-reflection-input-trace-request.json', import.meta.url);
    const frozen = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as {
      priorRunId: string;
      requests: Array<{ inputId: string; request: unknown }>;
    };
    expect(frozen.priorRunId).toBe('q1-incremental-reflection-review-fields-2026-10-30');
    expect(frozen.requests.map((item) => item.inputId)).toEqual(['choice-only', 'brewery-claim']);
    expect(frozen.requests[0]?.request).not.toEqual(caseA);
    const repairFixture = JSON.parse(
      readFileSync(new URL('../incremental-reflection-choice-repair-request.json', import.meta.url), 'utf8'),
    ) as { priorRunId: string; requests: Array<{ inputId: string; request: unknown }> };
    expect(repairFixture.priorRunId).toBe('q1-incremental-reflection-input-trace-2026-10-30');
    expect(repairFixture.requests).toHaveLength(1);
    expect(repairFixture.requests[0]?.inputId).toBe('choice-only');
    expect(repairFixture.requests[0]?.request).toEqual(frozen.requests[0]?.request);
    expect(repairFixture.requests[0]?.request).not.toEqual(caseA);
  });

  it('freezes meaning-trace requests that keep a choice as priority and a claim as unverified', () => {
    const evidence = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json', import.meta.url), 'utf8'),
    ) as { businessInput: string; report: { calls: Array<{ promptVersion: string; raw: string }> } };
    const previousRaw = evidence.report.calls.find((call) => call.promptVersion === 'quality-14-cpo-draft:brewery');
    const parsed = parseSections(previousRaw?.raw ?? '', evidence.businessInput);
    const selected = parsed?.analysis?.choices.find((choice) => choice.label === '체험 프로그램을 먼저 검증할 것');
    const feedback = {
      feedbackId: 'feedback-trace',
      reviewId: 'review-trace',
      userId: 'user-trace',
      agreement: 'need_info' as const,
      accuracy: 'hard_to_compare' as const,
      revisionAreas: ['other' as const],
      comment: selected?.label ?? '',
      nextAction: 'verify_hypotheses' as const,
      marks: [],
      choiceAnswer: { choiceId: selected?.id ?? '', label: selected?.label ?? '', otherText: '' },
      submittedAt: '2026-10-30T08:00:00.000Z',
      modelCalls: 0 as const,
    };
    const caseA = buildFollowUpRequest({
      originalInput: evidence.businessInput,
      sections: parsed!,
      feedback,
      supplement: '',
      answerOrigin: 'synthetic-test-data',
    });
    const caseB = buildFollowUpRequest({
      originalInput: evidence.businessInput,
      sections: parsed!,
      feedback,
      supplement: FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM,
      answerOrigin: 'synthetic-test-data',
    });
    const record = {
      businessInput: evidence.businessInput,
      dataClass: 'synthetic-test-data',
      notice: '테스트용 합성 데이터. 실제 창업자 답변이 아니며 실제 사업 검증 결과가 아니다.',
      analysisContract: 'parsed-sections-1',
      outputContract: 'reflection-output-11',
      baselineSource: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json',
      priorRunId: 'q1-incremental-reflection-choice-repair-2026-10-30',
      confounders: [
        {
          id: 'call_path',
          detail:
            'Preview build reads this frozen request and calls the model directly. It does not call the product second-review route.',
        },
        {
          id: 'meaning',
          detail:
            'A choice sets verification priority and does not change the stored judgment. An unverified brewery claim stays a claim. One repair names the failed checks. An identical repair is a fail. There is no third call.',
        },
      ],
      requests: [
        { inputId: 'choice-only', promptVersion: 'reflection-output-11:choice-only', request: caseA },
        { inputId: 'brewery-claim', promptVersion: 'reflection-output-11:brewery-claim', request: caseB },
      ],
    };
    const fixtureUrl = new URL('../incremental-reflection-meaning-request.json', import.meta.url);
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(fixtureUrl, `${JSON.stringify(record, null, 2)}\n`);
    expect(JSON.parse(readFileSync(fixtureUrl, 'utf8'))).toEqual(record);
    const historical = JSON.parse(
      readFileSync(new URL('../incremental-reflection-input-trace-request.json', import.meta.url), 'utf8'),
    ) as { requests: Array<{ request: unknown }> };
    expect(record.requests[0]?.request).not.toEqual(historical.requests[0]?.request);
  });
});

function contractRaw(text: string): string {
  const branch = quality10Branch(text);
  return JSON.stringify({
    summary: branch.summary,
    customer: branch.customer,
    problem: '미확인',
    value: '미확인',
    operatingModel: '구상',
    alternatives: '미확인',
    differentiation: '미확인',
    payer: '미확인',
    revenueModel: quality7RevenueString(text),
    market: '미확인',
    competition: '미확인',
    operations: '미확인',
    profitability: '미확인',
    strengths: ['미확인'],
    risks: ['미확인'],
    assumptions: ['미확인'],
    evidenceToChange: ['미확인'],
    founderFacts: quality8FounderFacts(text),
    inferences: [quality9Inference(text)],
    judgment: '미확인',
    nextVerification: branch.question,
    nextQuestion: branch.question,
    nextQuestionReason: '입력만으로는 무엇을 먼저 확인할지 정해지지 않는다.',
    choices: [...branch.choices],
  });
}

function analysisRaw(revenueModel: string | Record<string, string>): string {
  return JSON.stringify({
    summary: '관광객의 양조장 체험과 양조장의 온라인 마케팅 지원을 함께 구상한다.',
    customer: '전통주를 좋아하는 내국인·외국인 관광객',
    problem: '미확인',
    value: '미확인',
    operatingModel: '구상 중이며 운영 방식은 확정되지 않았다.',
    alternatives: '미확인',
    differentiation: '미확인',
    payer: '미확인',
    revenueModel,
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
    choices: [...QUALITY6_BREWERY_CHOICES],
  });
}

function stored(
  reviewId: string,
  status: StoredReview['status'],
  sections: StoredReview['sections'],
  rawContent: string,
  error: string | null,
): StoredReview {
  return {
    reviewId,
    userId: 'user-a',
    version: 1,
    parentReviewId: null,
    sourceFeedbackId: null,
    supplementSha: null,
    projectId: 'project-test',
    inputSha: 'sha',
    inputText: COMPARE_BUSINESS_INPUT,
    inputOrigin: 'typed',
    fileName: null,
    status,
    evidence: 'injected_http',
    provider: 'openai',
    model: 'gpt-4o-mini',
    sections,
    rawContent,
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    usageKnown: true,
    callCount: 1,
    latencyMs: 1,
    error,
    requestedAt: '2026-10-29T08:00:00.000Z',
    finishedAt: '2026-10-29T08:00:01.000Z',
  };
}
