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
  buildQuality2CompareRequest,
  buildQuality3CompareRequest,
  compareConfounders,
  executeQualityCompare,
} from '../ai-pm-quality-compare';

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
    expect(PREVIEW_COMPARE_RUN_ID).toBe('q1-preview-brewery-2026-10-29');
    expect(redactComparePayload({ note: 'sk-testsecretvalue and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb' }, ['service-role-secret'])).toEqual({
      note: '[redacted] and [redacted-jwt]',
    });
    const script = readFileSync(new URL('../../../../scripts/preview-quality-compare-once.mjs', import.meta.url), 'utf8');
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
  });

  it('keeps the preview request fixture equal to the builders', () => {
    const fixtureUrl = new URL('../quality-compare-requests.json', import.meta.url);
    const fresh = {
      businessInput: COMPARE_BUSINESS_INPUT,
      confounders: compareConfounders(),
      requests: [
        { promptVersion: AI_PM_FIRST_PROMPT_VERSION, request: buildQuality2CompareRequest() },
        { promptVersion: QUALITY3_PROMPT_VERSION, request: buildQuality3CompareRequest() },
      ],
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(fixtureUrl, `${JSON.stringify(fresh, null, 2)}\n`);
    expect(JSON.parse(readFileSync(fixtureUrl, 'utf8'))).toEqual(fresh);
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
