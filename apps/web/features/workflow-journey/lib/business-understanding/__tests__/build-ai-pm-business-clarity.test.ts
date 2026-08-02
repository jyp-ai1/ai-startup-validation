import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  buildAiPmBusinessClarity,
  buildAiPmReturnWelcome,
  buildBusinessEvolutionSnapshot,
  buildWorkspaceBusinessState,
  formatBusinessSnapshotEvidence,
} from '../build-ai-pm-business-clarity';

const BROAD_CUSTOMER_DOC = `
# 사업계획서
## 고객
중소기업, 제조 공장, 스타트업
## 문제
생산성이 낮습니다.
## 솔루션
AI 기반 생산 관리 SaaS
`.trim();

const DEMO_DOC = `스마트팩토리 예지보전 SaaS
창업자: 김대표
사업: 30인 이하 제조기업 대상 설비 고장 예측
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%
BM: 월 49만 원 구독 · 공장당 10대 센서 포함`;

describe('buildBusinessEvolutionSnapshot', () => {
  it('Turn 0 — product + draft customer only', () => {
    const understanding = buildBusinessUnderstanding(BROAD_CUSTOMER_DOC);
    const snapshot = buildBusinessEvolutionSnapshot({
      documentText: BROAD_CUSTOMER_DOC,
      turns: [],
      understanding,
    });

    expect(snapshot.turnCount).toBe(0);
    expect(snapshot.product).toContain('SaaS');
    expect(snapshot.fields).toEqual([{ label: '고객', value: expect.stringContaining('중소') }]);
  });

  it('Turn 1 — customer segment, user, payer evolve', () => {
    const understanding = buildBusinessUnderstanding(BROAD_CUSTOMER_DOC);
    const snapshot = buildBusinessEvolutionSnapshot({
      documentText: BROAD_CUSTOMER_DOC,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '30인 이하 제조기업입니다. 사용자는 공장장, 구매자는 대표입니다.',
          appliedAt: new Date().toISOString(),
        },
      ],
      understanding,
    });

    expect(snapshot.fields.map((field) => field.label)).toEqual(['고객', '사용자', '구매자']);
    expect(snapshot.fields[0]?.value).toContain('30인 이하');
    expect(snapshot.fields[1]?.value).toBe('공장장');
    expect(snapshot.fields[2]?.value).toBe('대표');
  });

  it('Turn 3 — adds problem and value proposition', () => {
    const understanding = buildBusinessUnderstanding(BROAD_CUSTOMER_DOC);
    const snapshot = buildBusinessEvolutionSnapshot({
      documentText: BROAD_CUSTOMER_DOC,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '30인 이하 제조기업. 사용자는 공장장, 구매자는 대표.',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'problem_definition',
          answer: '설비 멈춤으로 생산 차질이 생깁니다.',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'bm_design',
          answer: '월 구독으로 공장당 센서 패키지를 제공합니다.',
          appliedAt: new Date().toISOString(),
        },
      ],
      understanding,
    });

    expect(snapshot.turnCount).toBe(3);
    expect(snapshot.fields.some((field) => field.label === '문제')).toBe(true);
    expect(snapshot.fields.some((field) => field.label === '가치제안')).toBe(true);
    expect(formatBusinessSnapshotEvidence(snapshot)).toContain('문제');
  });

  it('Turn 6 — full business fields visible', () => {
    const understanding = buildBusinessUnderstanding(DEMO_DOC);
    const snapshot = buildBusinessEvolutionSnapshot({
      documentText: DEMO_DOC,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '30인 이하 제조기업. 사용자는 공장장, 구매자는 대표.',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'problem_definition',
          answer: '설비 멈춤으로 생산 차질',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'bm_design',
          answer: '월 49만 원 구독 · 공장당 10대 센서',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'competitor_analysis',
          answer: '엑셀 수기 관리, 레거시 MES',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'market_validation',
          answer: '국내 3만 개 중소 제조 공장',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'customer_definition',
          answer: '30인 이하 제조기업 설비 관리자 / 공장장',
          appliedAt: new Date().toISOString(),
        },
      ],
      understanding,
    });

    expect(snapshot.turnCount).toBe(6);
    expect(snapshot.fields.map((field) => field.label)).toEqual(
      expect.arrayContaining(['고객', '사용자', '구매자', '문제', '가치제안', '대체재', '시장']),
    );
  });
});

describe('buildAiPmBusinessClarity', () => {
  it('builds before/after business evolution from turns', () => {
    const understanding = buildBusinessUnderstanding(BROAD_CUSTOMER_DOC);
    const clarity = buildAiPmBusinessClarity({
      documentText: BROAD_CUSTOMER_DOC,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '구매자는 대표입니다. 사용자는 공장장입니다.',
          appliedAt: new Date().toISOString(),
        },
      ],
      understanding,
    });

    expect(clarity?.initialSummary).toContain('중소');
    expect(clarity?.currentSummary).toContain('공장장');
    expect(clarity?.currentSummary).toContain('대표');
    expect(clarity?.evolutionLead).toMatch(/^이제 사업은 "/);
  });

  it('returns null without completed turns', () => {
    const clarity = buildAiPmBusinessClarity({
      documentText: BROAD_CUSTOMER_DOC,
      turns: [],
      understanding: buildBusinessUnderstanding(BROAD_CUSTOMER_DOC),
    });
    expect(clarity).toBeNull();
  });
});

describe('buildWorkspaceBusinessState', () => {
  it('builds header-first business state with evolving snapshot', () => {
    const understanding = buildBusinessUnderstanding(BROAD_CUSTOMER_DOC);
    const state = buildWorkspaceBusinessState({
      documentText: BROAD_CUSTOMER_DOC,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '구매자는 대표입니다. 사용자는 공장장입니다.',
          appliedAt: new Date().toISOString(),
        },
      ],
      understanding,
      nextIssueId: 'problem_definition',
    });

    expect(state?.label).toBe('현재 사업');
    expect(state?.snapshot.fields.some((field) => field.label === '사용자' && field.value === '공장장')).toBe(
      true,
    );
    expect(state?.snapshot.fields.some((field) => field.label === '구매자' && field.value === '대표')).toBe(
      true,
    );
    expect(state?.partnerNext?.invite).toBe('같이 확인해 볼까요?');
  });
});

describe('buildAiPmReturnWelcome', () => {
  it('builds thought-continuity welcome for return visit', () => {
    const understanding = buildBusinessUnderstanding(DEMO_DOC);
    const welcome = buildAiPmReturnWelcome({
      documentText: DEMO_DOC,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '30인 이하 제조기업 설비 관리자 / 공장장',
          appliedAt: new Date().toISOString(),
        },
      ],
      understanding,
      nextIssueId: 'problem_definition',
    });

    expect(welcome?.greeting).toBe('안녕하세요.');
    expect(welcome?.recapLead).toContain('구매자');
    expect(welcome?.clarityLead).toContain('선명해졌습니다');
    expect(welcome?.partnerInvite).toContain('같이 확인해 볼까요?');
    expect(welcome?.partnerInvite).toContain('불편한');
    expect(welcome?.businessClarity.currentSummary).toContain('공장장');
  });
});
