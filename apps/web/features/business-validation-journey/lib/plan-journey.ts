import type {
  AnalysisProvenance,
  FounderAnswer,
  Intake,
  JourneyState,
  NextQuestion,
  PlanCase,
  PlanClaim,
  PlanFixtureResult,
  PlanProfile,
} from './journey-types';
import { verificationActionFor } from './verification-action';

const NOT_VALIDATED = '검증된 사실이 아니다. 사업성 판단은 유보한다.';

export const LMULM_PLAN_FIXTURE = `[테스트 픽스처] 2024년 초기창업패키지 사업계획서 발췌. 실제 원장 아님.
사업: LMULM. 한정판 문구 커머스와 리셀 플랫폼.
고객: 한정판 문구를 수집하는 203040 세대.
문제: 한정판 출시 일정을 일일이 검색해야 하고, 구매한 상품을 다시 판매하는 과정이 번거롭다.
해결책: 한정판 일정과 제품 정보를 한곳에 모으고, 구매 이력으로 사용자끼리 리셀한다.
구매자: 한정판을 사는 최종 고객.
수익: 판매 마진 30~40%. 리셀 수수료 3~5%는 거래 예정.
근거: 2023년 8~12월 매출 2,000만 원. 구매전환율 3.8~5.7%. 고객유입비용 118~220원. 공급사 협력 체계. 앱 출시.
출처: 초기창업패키지 사업계획서.`;

export const RIDM_PLAN_FIXTURE = `[테스트 픽스처] 2026년 3월 RIDM AI 투자자 사업계획서 발췌. 실제 결제 원장 아님.
사업: RIDM AI. AI 에이전트 생성·배포·수익화 플랫폼.
고객: 개인 창작자, AI 캐릭터 운영자, 전문가, 기업.
문제: 사용자는 AI를 소비할 수는 있지만 자신의 AI를 만들어 사업화하기 어렵다.
해결책: 에이전트 생성, 독립 URL 배포, 외부 API 연동, 구독·후원·광고·B2B.
구매자: 구독자와 기업 고객을 가정.
수익: 구독 월 9,900원. 2026년 MAU 5만, 전환율 3%, ARR 약 3.3억 원. 2027년 ARR 약 28억 원.
근거: 현재 Pre-revenue. 내부 베타. 기능 개발 완료. 국내 특허 출원.
출처: RIDM AI 투자자 사업계획서.`;

export function planProfileOf(text: string): PlanProfile {
  const lmulm = /LMULM|엘엠유엘엠|문구 한정판/.test(text);
  const ridm = /RIDM|Pre-revenue|에이전트 플랫폼/.test(text);
  if (lmulm && !ridm) return 'lmulm';
  if (ridm && !lmulm) return 'ridm';
  return 'unrecognized';
}

export function structureBusinessPlan(input: {
  text: string;
  sourceLabel: string;
  provenance: AnalysisProvenance;
}): { intake: Intake; planCase: PlanCase } | { intake: null; planCase: null } {
  const text = input.text.trim();
  const profile = planProfileOf(text);
  if (profile === 'unrecognized' || !input.sourceLabel.trim()) return { intake: null, planCase: null };
  const sourceLabel = input.sourceLabel.trim();
  const provenance = input.provenance;
  if (profile === 'lmulm') {
    const claims = lmulmClaims(sourceLabel, provenance);
    return {
      intake: {
        business: 'LMULM. 한정판 문구 커머스와 리셀 플랫폼.',
        customer: '한정판 문구를 수집하는 203040 세대',
        problem: '한정판 출시 일정을 일일이 검색해야 하고, 구매한 상품의 재판매가 번거롭다.',
        solution: '한정판 일정과 제품 정보를 모으고, 구매 이력으로 리셀한다.',
        payer: 'end_customer',
        revenue: 'fee',
        evidence: '',
        url: '',
      },
      planCase: {
        profile,
        provenance,
        sourceLabel,
        claims,
        support: [
          '문서에 2023년 8~12월 매출 2,000만 원이라는 과거 거래 주장이 있다.',
          '앱 출시와 공급사 협력 문장이 있다.',
        ],
        counter: [
          '리셀 수수료는 거래 예정이다. 발생한 리셀 거래 문장은 없다.',
          '재구매, 공헌이익, 원장 검증은 문서에 없다.',
        ],
        unknowns: ['원장 검증', '재구매', '실제 리셀', '공헌이익'],
        decisiveGap: '과거 거래 주장과 리셀 반복 매출은 다른 가설이다.',
        exitCondition: '재구매, 실제 리셀, 공헌이익이 원장으로 확인되기 전에는 유보를 끝내지 않는다.',
        openingJudgment: `LMULM 문서에는 2023년 8~12월 매출 2,000만 원이라는 과거 거래 주장이 있다. 리셀 플랫폼의 반복 매출은 별도 가설이며 거래 예정으로 적혀 있다. 원장, 재구매, 공헌이익은 확인하지 않았다. ${NOT_VALIDATED}`,
        fixtureResults: [],
      },
    };
  }
  const claims = ridmClaims(sourceLabel, provenance);
  return {
    intake: {
      business: 'RIDM AI. AI 에이전트 생성·배포·수익화 플랫폼.',
      customer: '개인 창작자, AI 캐릭터 운영자, 전문가, 기업',
      problem: '사용자는 AI를 소비할 수는 있지만 자신의 AI를 만들어 사업화하기 어렵다.',
      solution: '에이전트 생성, 독립 URL 배포, 구독·후원·광고·B2B.',
      payer: 'unknown',
      revenue: 'subscription',
      evidence: '',
      url: '',
    },
    planCase: {
      profile,
      provenance,
      sourceLabel,
      claims,
      support: ['제품 범위와 구독 월 9,900원 산식이 문서에 있다.', '내부 베타와 기능 개발 완료 문장이 있다.'],
      counter: [
        '문서는 현재 Pre-revenue라고 적는다.',
        'MAU, 전환율, ARR은 미래 가정이다. 유료 고객 수는 없다.',
      ],
      unknowns: ['최초 유료 결제', '유지율', '고객당 추론 비용'],
      decisiveGap: 'Pre-revenue 상태와 미래 매출 가정은 다른 문장이다.',
      exitCondition: '최초 유료 결제, 유지율, 고객당 비용이 확인되기 전에는 유보를 끝내지 않는다.',
      openingJudgment: `RIDM AI 문서는 현재 Pre-revenue라고 적는다. MAU, ARR, 전환율은 미래 가정이다. 유료 고객, 유지율, 고객당 추론 비용은 확인하지 않았다. ${NOT_VALIDATED}`,
      fixtureResults: [],
    },
  };
}

export function planQuestions(planCase: PlanCase | null | undefined, asked: Set<string>): NextQuestion[] {
  if (!planCase || planCase.profile === 'unrecognized') return [];
  if (planCase.profile === 'lmulm') return lmulmQuestions(asked);
  return ridmQuestions(asked);
}

export function planAnswerEffect(
  answer: FounderAnswer,
): { nextText: string; judgmentChanged: boolean; reason: string; held: boolean; affected: string[] } | null {
  if (answer.delta === 'duplicate') {
    return null;
  }
  switch (answer.uncertaintyId) {
    case 'u-lmulm-ledger':
      if (answer.choiceId === 'happened') {
        const nextText = `창업자는 2023년 매출 2,000만 원이 실제 발생했다고 확인했다. 그 확인은 주장이다. 원장 검증은 미확인이다. 리셀 반복 매출 가설은 그대로다. ${NOT_VALIDATED}`;
        return {
          nextText,
          judgmentChanged: true,
          reason: '창업자 확인을 주장으로 기록한다. 원장 검증 여부는 미확인으로 둔다.',
          held: false,
          affected: ['h-past-transaction'],
        };
      }
      return {
        nextText: '',
        judgmentChanged: false,
        reason: '원장을 확인하지 못했다. 과거 거래 문장은 문서 주장으로 남고 판단 문장은 유지한다.',
        held: false,
        affected: [],
      };
    case 'u-lmulm-repurchase':
      if (answer.choiceId === 'unknown') {
        return {
          nextText: '',
          judgmentChanged: false,
          reason: '재구매율은 모른다. 같은 질문을 반복하지 않고 주문 데이터로 재구매 코호트를 만드는 검증으로 넘긴다.',
          held: false,
          affected: [],
        };
      }
      return {
        nextText: `재구매율을 알고 있다는 창업자 진술이다. 주문 코호트로 확인하지 않았다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '재구매율 진술은 주장이다. 코호트 검증은 미확인이다.',
        held: false,
        affected: ['h-resale'],
      };
    case 'u-lmulm-margin':
      return {
        nextText: `상품 마진 35%는 매출총이익에 대한 창업자 진술이다. 배송, 결제, 반품, 운영비를 반영한 공헌이익은 그와 다르며 아직 확인되지 않았다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '매출총이익 주장과 공헌이익을 구분한다. 공헌이익은 미확인이다.',
        held: false,
        affected: ['h-contribution'],
      };
    case 'u-ridm-payers':
      if (answer.choiceId === 'none') {
        return {
          nextText: `유료 고객은 아직 없다는 창업자 진술이다. 구독 전환율 가정은 실적이 아니다. 최초 유료 고객 검증으로 넘긴다. ${NOT_VALIDATED}`,
          judgmentChanged: true,
          reason: '유료 고객이 없다는 진술을 기록한다. 전환율 가정을 실적으로 취급하지 않는다.',
          held: false,
          affected: ['h-payer'],
        };
      }
      return {
        nextText: `유료 고객이 있다는 창업자 진술이다. 결제 원장은 확인하지 않았다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '유료 고객 주장을 기록한다. 결제 원장 검증은 미확인이다.',
        held: false,
        affected: ['h-payer'],
      };
    case 'u-ridm-liking':
      if (answer.choiceId === 'likes') {
        return {
          nextText: '',
          judgmentChanged: false,
          reason: '호감 표현은 지불 의향이나 결제 사실이 아니다. 판단 문장을 유지한다.',
          held: false,
          affected: [],
        };
      }
      return {
        nextText: '',
        judgmentChanged: false,
        reason: '호감과 결제를 구분한 답이다. 결제 사실이 원장으로 확인되지 않아 판단 문장을 유지한다.',
        held: false,
        affected: [],
      };
    case 'u-ridm-cost':
      return {
        nextText: '',
        judgmentChanged: false,
        reason: '고객당 추론 비용을 모른다. 사용량, 모델, 인프라 비용을 측정하는 검증이 다음 행동이다.',
        held: false,
        affected: [],
      };
    case 'u-counter-evidence':
      return {
        nextText: `기존 주장과 반대 근거를 둘 다 남긴다. 충돌이며 어느 쪽도 검증된 사실이 아니다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '모순되는 근거를 지우지 않는다. 충돌로 표시하고 판단은 유보한다.',
        held: true,
        affected: ['h-problem'],
      };
    default:
      return null;
  }
}

export function decisionSnapshot(state: JourneyState): {
  stage: '판단 유보';
  conclusion: string;
  support: string[];
  counter: string[];
  unresolved: string[];
  nextAction: string;
  exitCondition: string;
  verifiedFact: false;
  fixtureLabel: string | null;
  fixtureResults: PlanFixtureResult[];
} | null {
  const plan = state.planCase;
  if (!plan || plan.profile === 'unrecognized') return null;
  const verification = verificationActionFor(state);
  return {
    stage: '판단 유보',
    conclusion: state.judgmentText,
    support: plan.support,
    counter: plan.counter,
    unresolved: plan.unknowns,
    nextAction: state.nextQuestion ? state.nextQuestion.prompt : verification.action,
    exitCondition: plan.exitCondition,
    verifiedFact: false,
    fixtureLabel: plan.provenance === 'test_fixture' ? '테스트 픽스처 · 실제 사업 증거 아님' : '사용자가 가져온 문서 주장 · 원장 검증 아님',
    fixtureResults: plan.fixtureResults,
  };
}

export function blockersToClose(state: JourneyState): { closed: false; unresolved: string[]; reason: string } {
  const plan = state.planCase;
  const unresolved = plan?.unknowns ?? ['검증 결과 없음'];
  return {
    closed: false,
    unresolved,
    reason: '검증 결과가 없다. 미해결 가설과 부족한 근거를 완료로 바꾸지 않는다.',
  };
}

export function withFixtureResult(state: JourneyState, note: string, now: string): JourneyState {
  const plan = state.planCase;
  if (!plan) return state;
  const fixture: PlanFixtureResult = {
    id: `fixture-${plan.fixtureResults.length + 1}-${now}`,
    note: note.trim() || '이름을 붙이지 않은 테스트 문장',
    provenance: 'test_fixture',
    verifiedFact: false,
    systemVerified: false,
    label: '테스트 픽스처 · 실제 검증 완료 아님',
  };
  return {
    ...state,
    planCase: { ...plan, fixtureResults: [...plan.fixtureResults, fixture] },
  };
}

function claim(
  id: string,
  role: PlanClaim['role'],
  text: string,
  sourceLabel: string,
  provenance: AnalysisProvenance,
): PlanClaim {
  return { id, role, text, sourceLabel, claimStatus: 'CLAIM', ledgerChecked: false, provenance };
}

function lmulmClaims(sourceLabel: string, provenance: AnalysisProvenance): PlanClaim[] {
  return [
    claim('c-business', 'business', 'LMULM. 한정판 문구 커머스와 리셀 플랫폼.', sourceLabel, provenance),
    claim('c-customer', 'customer', '한정판 문구를 수집하는 203040 세대.', sourceLabel, provenance),
    claim('c-problem', 'problem', '한정판 검색과 재판매가 번거롭다.', sourceLabel, provenance),
    claim('c-solution', 'solution', '일정·정보 제공과 구매 이력 기반 리셀.', sourceLabel, provenance),
    claim('c-buyer', 'buyer', '한정판을 사는 최종 고객.', sourceLabel, provenance),
    claim('c-revenue', 'revenue', '판매 마진 30~40%. 리셀 수수료 3~5%는 예정.', sourceLabel, provenance),
    claim('c-sales', 'past_transaction', '2023년 8~12월 매출 2,000만 원이라는 문서상 거래 주장.', sourceLabel, provenance),
    claim('c-resale', 'resale_hypothesis', '리셀 플랫폼으로 반복 거래가 일어난다는 가설. 문서에는 예정이라고 적혀 있다.', sourceLabel, provenance),
  ];
}

function ridmClaims(sourceLabel: string, provenance: AnalysisProvenance): PlanClaim[] {
  return [
    claim('c-business', 'business', 'RIDM AI. AI 에이전트 생성·배포·수익화 플랫폼.', sourceLabel, provenance),
    claim('c-customer', 'customer', '개인 창작자, AI 캐릭터 운영자, 전문가, 기업.', sourceLabel, provenance),
    claim('c-problem', 'problem', '자신의 AI를 만들어 사업화하기 어렵다.', sourceLabel, provenance),
    claim('c-solution', 'solution', '생성, 독립 URL, API 연동, 구독·후원·광고·B2B.', sourceLabel, provenance),
    claim('c-buyer', 'buyer', '구독자와 기업 고객은 가정이다.', sourceLabel, provenance),
    claim('c-revenue', 'revenue', '구독 월 9,900원과 MAU·전환율·ARR 가정.', sourceLabel, provenance),
    claim('c-stage', 'pre_revenue', '현재 Pre-revenue. 내부 베타와 기능 개발 완료 문장.', sourceLabel, provenance),
    claim('c-forecast', 'forecast', '2026년 전환율 3%와 ARR, 2027년 ARR은 미래 가정이다.', sourceLabel, provenance),
  ];
}

function lmulmQuestions(asked: Set<string>): NextQuestion[] {
  const questions: NextQuestion[] = [];
  if (!asked.has('u-lmulm-ledger')) {
    questions.push({
      uncertaintyId: 'u-lmulm-ledger',
      hypothesisId: 'h-past-transaction',
      prompt: '2023년 매출 2,000만 원은 원장으로 확인된 거래인가, 문서와 창업자 진술인가?',
      whyDifferent: '과거 거래 주장을 리셀 가설의 증거로 쓰지 않으려면, 원장 확인 여부부터 가른다.',
      purpose: '문서상 매출 주장을 원장 검증과 분리한다.',
      answerBranches: '실제 발생 확인은 주장으로 남긴다. 원장 검증은 미확인이다. 문서뿐이면 판단 문장을 유지한다.',
      unchangedWhen: '원장 원문이 없으면 반복 매출 판단을 바꾸지 않는다.',
      allowsFreeText: true,
      choices: [
        { id: 'happened', label: '2023년 매출 2,000만 원은 실제 발생했다', grade: 'claimed_record' },
        { id: 'document_only', label: '문서에 적힌 주장이다', grade: 'founder_estimate' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }
  if (!asked.has('u-lmulm-repurchase')) {
    questions.push({
      uncertaintyId: 'u-lmulm-repurchase',
      hypothesisId: 'h-resale',
      prompt: '그 구매 고객이 다시 샀는가? 재구매율을 알고 있나?',
      whyDifferent: '재구매가 확인되면 반복 매출 가설이 바뀐다. 모르면 같은 매출 질문을 반복하지 않는다.',
      purpose: '초기 매출 주장을 반복 매출과 분리한다.',
      answerBranches: '재구매율을 말하면 주장으로 남긴다. 모르면 주문 코호트 검증으로 넘긴다.',
      unchangedWhen: '재구매율을 모른다는 답은 반복 매출 판단을 확정하지 않는다.',
      allowsFreeText: true,
      choices: [
        { id: 'have_rate', label: '재구매율을 알고 있다', grade: 'claimed_record' },
        { id: 'unknown', label: '재구매율은 모른다', grade: 'unknown' },
      ],
    });
  }
  if (!asked.has('u-lmulm-margin')) {
    questions.push({
      uncertaintyId: 'u-lmulm-margin',
      hypothesisId: 'h-contribution',
      prompt: '상품 마진 35%는 매출총이익인가, 배송·결제·반품·운영비를 뺀 공헌이익인가?',
      whyDifferent: '마진 진술이 있어도 공헌이익이 비어 있으면 수익성 판단이 바뀌지 않는다.',
      purpose: '매출총이익과 공헌이익을 구분한다.',
      answerBranches: '35%는 매출총이익 주장으로 기록한다. 공헌이익은 비용 확인 전엔 열지 않는다.',
      unchangedWhen: '배송·결제·반품·운영비 없이 마진만 말하면 수익성 확정으로 바꾸지 않는다.',
      allowsFreeText: true,
      choices: [
        { id: 'margin_35', label: '상품 마진은 35%다', grade: 'founder_estimate' },
        { id: 'unknown', label: '마진을 구분할 자료가 없다', grade: 'unknown' },
      ],
    });
  }
  return questions;
}

function ridmQuestions(asked: Set<string>): NextQuestion[] {
  const questions: NextQuestion[] = [];
  if (!asked.has('u-ridm-payers')) {
    questions.push({
      uncertaintyId: 'u-ridm-payers',
      hypothesisId: 'h-payer',
      prompt: '지금 돈을 낸 고객이 있나?',
      whyDifferent: '전환율 가정과 유료 고객 실적은 다르다. 유료 고객 유무가 매출 가정을 실적으로 바꿀 수 있다.',
      purpose: 'Pre-revenue와 미래 매출 가정을 분리한다.',
      answerBranches: '아직 없다는 답은 전환율 가정을 실적으로 두지 않고 최초 유료 고객 검증으로 넘긴다.',
      unchangedWhen: '유료 결제 원문이 없으면 ARR 가정을 실적으로 바꾸지 않는다.',
      allowsFreeText: true,
      choices: [
        { id: 'none', label: '유료 고객은 아직 없다', grade: 'founder_estimate' },
        { id: 'have_payer', label: '유료 결제 고객이 있다고 본다', grade: 'claimed_record' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }
  if (!asked.has('u-ridm-liking')) {
    questions.push({
      uncertaintyId: 'u-ridm-liking',
      hypothesisId: 'h-demand',
      prompt: '고객이 좋아한다는 말과, 돈을 냈다는 기록을 구분할 수 있나?',
      whyDifferent: '유료 고객 질문에 답한 뒤다. 호감은 결제와 다른 불확실성이므로 전환율 질문을 반복하지 않는다.',
      purpose: '호감 표현을 지불 의향이나 결제로 올리지 않는다.',
      answerBranches: '좋아한다는 말은 판단 문장을 유지한다. 결제 기록이 있어도 원장 검증 전에는 사실로 올리지 않는다.',
      unchangedWhen: '호감 표현만으로는 지불 판단이 바뀌지 않는다.',
      allowsFreeText: true,
      choices: [
        { id: 'likes', label: '고객이 AI 캐릭터를 좋아한다고 했다', grade: 'founder_estimate' },
        { id: 'paid', label: '돈을 냈다는 기록이 따로 있다', grade: 'claimed_record' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }
  if (!asked.has('u-ridm-cost')) {
    questions.push({
      uncertaintyId: 'u-ridm-cost',
      hypothesisId: 'h-cost',
      prompt: '유료 고객 한 명의 추론·인프라 비용을 알고 있나?',
      whyDifferent: '호감과 결제 여부를 이미 구분했다. 남는 불확실성은 고객당 비용이다.',
      purpose: '매출 가정과 단위경제를 분리한다.',
      answerBranches: '모른다는 답은 사용량, 모델, 인프라 비용 측정으로 넘긴다.',
      unchangedWhen: '비용 측정 계획이 없으면 수익성 판단을 바꾸지 않는다.',
      allowsFreeText: true,
      choices: [
        { id: 'know', label: '고객당 추론 비용을 알고 있다', grade: 'claimed_record' },
        { id: 'unknown', label: '고객당 추론 비용을 모른다', grade: 'unknown' },
      ],
    });
  }
  return questions;
}
