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

export function planQuestions(
  planCase: PlanCase | null | undefined,
  asked: Set<string>,
  answers: { uncertaintyId: string; choiceId: string }[] = [],
): NextQuestion[] {
  if (!planCase || planCase.profile === 'unrecognized') return [];
  const next =
    planCase.profile === 'lmulm' ? nextLmulmQuestion(asked, answers) : nextRidmQuestion(asked, answers);
  return next ? [next] : [];
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
        reason:
          '재구매율은 반복 매출 판단의 핵심 불확실성이다. 이 답으로 판단 문장은 바꾸지 않는다. 같은 고객의 재주문이 적힌 주문 원장이 있으면 반복 매출 판단이 달라진다. 다음 행동은 그 원장으로 재구매 코호트를 만드는 것이다.',
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
      if (answer.choiceId === 'unknown' || answer.choiceId === 'unchecked' || answer.choiceId === 'cannot') {
        return {
          nextText: '',
          judgmentChanged: false,
          reason: '공헌이익을 계산할 비용이 없다. 마진 숫자를 만들지 않고 판단 문장은 유지한다.',
          held: false,
          affected: [],
        };
      }
      return {
        nextText: `공헌이익을 계산할 수 있다는 창업자 진술이다. 배송, 결제, 반품, 운영비 원장은 확인하지 않았다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '계산 가능하다는 답은 진술이다. 비용 원장 전에는 수익성을 확정하지 않는다.',
        held: false,
        affected: ['h-contribution'],
      };
    case 'u-ridm-payers':
      if (answer.choiceId === 'none') {
        return {
          nextText: `유료 고객은 아직 없다는 창업자 진술이다. 구독 전환율 가정은 실적이 아니다. 최초 유료 고객 검증으로 넘긴다. ${NOT_VALIDATED}`,
          judgmentChanged: true,
          reason:
            '유료 고객이 없다는 답으로 전환율 목표는 실적이 되지 않는다. 다음 행동은 최초 결제 의향과 실제 지불을 확인하는 것이다. 전환율 가정을 다시 설명하지 않는다.',
          held: false,
          affected: ['h-payer'],
        };
      }
      if (answer.choiceId === 'unknown' || answer.choiceId === 'unchecked') {
        return {
          nextText: '',
          judgmentChanged: false,
          reason:
            '유료 고객이 있는지는 모른다. 이 답은 유료 고객 존재의 근거가 아니다. 판단 문장은 바꾸지 않는다. 최초 결제 원문이 있으면 유료 고객 판단이 달라진다.',
          held: false,
          affected: [],
        };
      }
      if (answer.choiceId === 'test_only') {
        return {
          nextText: `테스트 결제만 있다는 창업자 진술이다. 테스트 결제를 매출이나 반복 결제로 세지 않는다. ${NOT_VALIDATED}`,
          judgmentChanged: true,
          reason: '테스트 결제는 유료 고객 검증이 아니다. 전환율 목표는 실적이 되지 않는다.',
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
      if (answer.choiceId === 'know') {
        return {
          nextText: `고객당 추론 비용을 알고 있다는 창업자 진술이다. 사용량, 모델, 인프라 원장은 확인하지 않았다. ${NOT_VALIDATED}`,
          judgmentChanged: true,
          reason: '비용 진술은 주장이다. 원장 전에는 단위경제를 확정하지 않는다.',
          held: false,
          affected: ['h-cost'],
        };
      }
      return {
        nextText: '',
        judgmentChanged: false,
        reason: '고객당 추론 비용을 모른다. 사용량, 모델, 인프라 비용을 측정하는 검증이 다음 행동이다.',
        held: false,
        affected: [],
      };
    case 'u-lmulm-mix':
      return lmulmMixEffect(answer.choiceId);
    case 'u-lmulm-independence':
      return lmulmIndependenceEffect(answer.choiceId);
    case 'u-lmulm-repurchase-track':
      return lmulmTrackEffect(answer.choiceId);
    case 'u-lmulm-resale':
      return {
        nextText: `리셀 거래 발생에 대한 창업자 진술이다. 문서의 리셀 수수료는 예정으로 남는다. 거래 건수를 확인하지 않았다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '리셀 발생 답은 진술이다. 거래 원장이 없으면 리셀 플랫폼 성립으로 바꾸지 않는다.',
        held: false,
        affected: ['h-resale'],
      };
    case 'u-lmulm-mix-split':
      return {
        nextText: '',
        judgmentChanged: false,
        reason: '기타 매출을 채널별로 나누지 못하면 비중을 추정으로 채우지 않는다. 판단 문장은 유지한다.',
        held: false,
        affected: [],
      };
    case 'u-lmulm-outside':
      return {
        nextText: `모회사 채널 밖 고객 확보에 대한 창업자 진술이다. 모회사 회원 2,000만 명은 회사 매출이 아니다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '독립 고객 답은 진술이다. 모회사 인프라 사업성과 기업 자체 사업성을 같은 근거로 두지 않는다.',
        held: false,
        affected: ['h-past-transaction'],
      };
    case 'u-ridm-wtp':
      return ridmWtpEffect(answer.choiceId);
    case 'u-ridm-conversion':
      return {
        nextText: `유료 전환율에 대한 창업자 진술이다. 문서의 전환율 3%와 MAU 목표는 실측으로 바뀌지 않는다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '전환율 답은 목표와 실측을 가른다. 측정했다는 진술도 결제 원장 전에는 실적이 아니다.',
        held: false,
        affected: ['h-payer'],
      };
    case 'u-ridm-focus':
      return {
        nextText: `향후 12개월의 우선 수익모델을 하나 골랐다는 가설이다. 고른 모델을 매출로 세지 않는다. 문서의 다른 수익모델은 지우지 않는다. ${NOT_VALIDATED}`,
        judgmentChanged: true,
        reason: '수익모델은 하나만 고르게 했다. 선택은 가설이고 복수 모델을 동시에 검증된 매출로 두지 않는다.',
        held: false,
        affected: ['h-payer'],
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

function latestChoice(
  answers: { uncertaintyId: string; choiceId: string }[],
  uncertaintyId: string,
): string | undefined {
  return [...answers].reverse().find((answer) => answer.uncertaintyId === uncertaintyId)?.choiceId;
}

function nextLmulmQuestion(
  asked: Set<string>,
  answers: { uncertaintyId: string; choiceId: string }[],
): NextQuestion | null {
  const mix = latestChoice(answers, 'u-lmulm-mix');
  if (!mix) return lmulmMixQuestion();
  if (!asked.has('u-lmulm-independence') && (mix === 'parent' || mix === 'b2b')) return lmulmIndependenceQuestion();
  if (!asked.has('u-lmulm-resale') && mix === 'fee') return lmulmResaleQuestion();
  if (!asked.has('u-lmulm-mix-split') && mix === 'other') return lmulmMixSplitQuestion();

  const split = latestChoice(answers, 'u-lmulm-mix-split');
  const track = latestChoice(answers, 'u-lmulm-repurchase-track');
  const shouldTrack = mix === 'b2c' || mix === 'unknown' || mix === 'unchecked' || split === 'can';
  if (shouldTrack && !track) return lmulmTrackQuestion();
  if (track === 'have' || track === 'partial') {
    return asked.has('u-lmulm-margin') ? null : lmulmMarginQuestion();
  }
  if (track === 'none' || track === 'unknown' || track === 'unchecked') return null;

  const independence = latestChoice(answers, 'u-lmulm-independence');
  if (independence === 'dependent' || independence === 'required') {
    return asked.has('u-lmulm-outside') ? null : lmulmOutsideQuestion();
  }
  if (independence && !asked.has('u-lmulm-resale')) return lmulmResaleQuestion();
  if (latestChoice(answers, 'u-lmulm-resale')) return null;
  if (split === 'cannot' || split === 'unknown' || split === 'unchecked') return null;
  return null;
}

function nextRidmQuestion(
  asked: Set<string>,
  answers: { uncertaintyId: string; choiceId: string }[],
): NextQuestion | null {
  const payers = latestChoice(answers, 'u-ridm-payers');
  if (!payers) return ridmPayerQuestion();
  const paidClaim = payers === 'have_payer' || payers === 'some' || payers === 'repeat' || payers === 'enterprise';
  if (paidClaim) {
    const conversion = latestChoice(answers, 'u-ridm-conversion');
    if (!conversion) return ridmConversionQuestion();
    if (conversion === 'measured' && !asked.has('u-ridm-cost')) return ridmCostQuestion();
    return null;
  }
  const wtp = latestChoice(answers, 'u-ridm-wtp');
  if (!wtp) return ridmWtpQuestion();
  if (wtp === 'not_yet' || wtp === 'unknown' || wtp === 'unchecked') return null;
  return asked.has('u-ridm-focus') ? null : ridmFocusQuestion();
}

function lmulmMixEffect(choiceId: string): {
  nextText: string;
  judgmentChanged: boolean;
  reason: string;
  held: boolean;
  affected: string[];
} {
  if (choiceId === 'unknown' || choiceId === 'unchecked') {
    return {
      nextText: '',
      judgmentChanged: false,
      reason: '매출 비중을 모른다. 비중을 추정으로 채우지 않는다. 문서의 2,000만 원 주장은 채널이 정해지지 않은 채로 남고 판단 문장은 유지한다.',
      held: false,
      affected: [],
    };
  }
  const label =
    choiceId === 'parent'
      ? '모회사·계열사 판매'
      : choiceId === 'b2b'
        ? '기업·단체 납품'
        : choiceId === 'fee'
          ? '공급·판매 수수료'
          : choiceId === 'other'
            ? '기타'
            : '일반 소비자 직접 판매';
  return {
    nextText: `매출의 가장 큰 비중을 ${label}라고 답했다. 창업자 진술이다. 2023년 매출 2,000만 원 문서 주장을 그 채널의 검증된 매출로 읽지 않는다. ${NOT_VALIDATED}`,
    judgmentChanged: true,
    reason: '매출 구성 답은 진술이다. 주문 원장이 없으면 플랫폼 매출과 관계사 매출을 가르지 못한다.',
    held: false,
    affected: ['h-past-transaction'],
  };
}

function lmulmIndependenceEffect(choiceId: string): {
  nextText: string;
  judgmentChanged: boolean;
  reason: string;
  held: boolean;
  affected: string[];
} {
  if (choiceId === 'unknown' || choiceId === 'unchecked') {
    return {
      nextText: '',
      judgmentChanged: false,
      reason: '모회사 의존도를 확인하지 못했다. 의존도를 추정으로 채우지 않고 판단 문장은 유지한다.',
      held: false,
      affected: [],
    };
  }
  return {
    nextText: `모회사·계열사 지원 없이 운영할 수 있는지에 대한 창업자 진술이다. 모회사 회원 2,000만 명은 회사 매출이 아니다. ${NOT_VALIDATED}`,
    judgmentChanged: true,
    reason: '모회사 인프라를 포함한 사업성과 기업 자체 사업성을 분리한다. 진술을 독립 매출의 증거로 올리지 않는다.',
    held: false,
    affected: ['h-past-transaction'],
  };
}

function lmulmTrackEffect(choiceId: string): {
  nextText: string;
  judgmentChanged: boolean;
  reason: string;
  held: boolean;
  affected: string[];
} {
  if (choiceId === 'none' || choiceId === 'unknown' || choiceId === 'unchecked') {
    return {
      nextText: '',
      judgmentChanged: false,
      reason: '재구매를 추적할 데이터가 없다. 재구매율을 추정하지 않는다. 판단 문장은 유지한다. 다음 행동은 재주문을 셀 기간과 고객 기준을 정하는 것이다.',
      held: false,
      affected: [],
    };
  }
  return {
    nextText: `재구매를 추적할 자료가 있다는 창업자 진술이다. 재구매율 숫자는 확인하지 않았다. ${NOT_VALIDATED}`,
    judgmentChanged: true,
    reason: '추적 가능하다는 답은 진술이다. 코호트 원장 전에는 반복 매출을 확인된 것으로 바꾸지 않는다.',
    held: false,
    affected: ['h-resale'],
  };
}

function ridmWtpEffect(choiceId: string): {
  nextText: string;
  judgmentChanged: boolean;
  reason: string;
  held: boolean;
  affected: string[];
} {
  if (choiceId === 'not_yet' || choiceId === 'unknown' || choiceId === 'unchecked') {
    return {
      nextText: `월 9,900원의 지불 이유는 아직 확인되지 않았다. 문서의 구독 단가는 가정으로 남는다. 유료 고객이 없다는 상태도 유지한다. ${NOT_VALIDATED}`,
      judgmentChanged: true,
      reason: '가격 수용성을 확인하지 못했다는 답으로 9,900원 가정을 지불 의사로 올리지 않는다.',
      held: false,
      affected: ['h-payer'],
    };
  }
  return {
    nextText: `지불 이유에 대한 창업자 진술이다. 캐릭터 URL 실험이나 가격 제시는 결제 사실이 아니다. 월 9,900원을 실험 가격으로 확정하지 않는다. ${NOT_VALIDATED}`,
    judgmentChanged: true,
    reason: '지불 이유 답은 가설이다. 결제 원문이 없으면 구독 매출로 바꾸지 않는다.',
    held: false,
    affected: ['h-payer'],
  };
}

function ask(
  input: Omit<NextQuestion, 'allowsFreeText'>,
): NextQuestion {
  return { ...input, allowsFreeText: true };
}

function lmulmMixQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-lmulm-mix',
    hypothesisId: 'h-past-transaction',
    prompt: '문서에 적힌 매출 2,000만 원의 가장 큰 비중은 어디입니까?',
    whyDifferent: '문서에는 자체 커머스, 모회사 제휴, 납품, 리셀 예정이 함께 있다. 고객이 누구인지는 이미 적혀 있으므로 다시 묻지 않는다.',
    purpose: '플랫폼 매출과 관계사·납품 매출을 가른다.',
    answerBranches: '모회사·납품이면 의존도를 묻고, 직접 판매이거나 모르면 재구매 추적 여부를 묻는다. 수수료면 리셀 발생을 묻는다.',
    unchangedWhen: '비중을 모르거나 아직 확인하지 않으면 채널을 추정으로 채우지 않는다.',
    choices: [
      { id: 'b2c', label: '일반 소비자 직접 판매', grade: 'founder_estimate' },
      { id: 'parent', label: '모회사·계열사 판매', grade: 'founder_estimate' },
      { id: 'b2b', label: '기업·단체 납품', grade: 'founder_estimate' },
      { id: 'fee', label: '공급·판매 수수료', grade: 'founder_estimate' },
      { id: 'other', label: '기타', grade: 'founder_estimate' },
      { id: 'unknown', label: '정확한 비중을 모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function lmulmIndependenceQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-lmulm-independence',
    hypothesisId: 'h-past-transaction',
    prompt: '모회사·계열사 지원이 없어도 현재 매출 구조를 유지할 수 있습니까?',
    whyDifferent: '매출 비중을 관계사·납품으로 답했다. 고객 정의를 다시 묻지 않고, 모회사 인프라와 기업 자체 매출을 가른다.',
    purpose: '모회사 채널 의존도를 확인한다.',
    answerBranches: '의존이 크면 모회사 밖 고객 기록을 묻고, 가능하거나 모르면 리셀 발생을 묻는다.',
    unchangedWhen: '의존도를 모르면 독립 가능으로 채우지 않는다.',
    choices: [
      { id: 'possible', label: '가능하다', grade: 'founder_estimate' },
      { id: 'partial', label: '일부 의존한다', grade: 'founder_estimate' },
      { id: 'dependent', label: '상당히 의존한다', grade: 'founder_estimate' },
      { id: 'required', label: '사실상 모회사 지원이 필수다', grade: 'founder_estimate' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function lmulmTrackQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-lmulm-repurchase-track',
    hypothesisId: 'h-resale',
    prompt: '그 구매 고객의 재구매를 추적할 수 있는 데이터가 있습니까?',
    whyDifferent: '재구매율을 추정하지 않는다. 데이터가 없으면 비율 대신 측정 여부를 묻는다.',
    purpose: '반복 구매를 문서상 매출과 분리한다.',
    answerBranches: '자료가 있으면 공헌이익을 계산할 수 있는지로 넘어간다. 없으면 질문을 끝내고 측정 설계를 다음 행동으로 둔다.',
    unchangedWhen: '데이터가 없거나 모르면 재구매율을 만들지 않고 판단 문장을 유지한다.',
    choices: [
      { id: 'have', label: '추적할 데이터가 있다', grade: 'founder_estimate' },
      { id: 'partial', label: '일부만 있다', grade: 'founder_estimate' },
      { id: 'none', label: '없다', grade: 'unknown' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function lmulmMarginQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-lmulm-margin',
    hypothesisId: 'h-contribution',
    prompt: '그 자료로 배송·결제·반품·운영비를 뺀 상품별 공헌이익을 계산할 수 있습니까?',
    whyDifferent: '재구매 추적 자료가 있다는 답 다음이다. 마진 숫자를 만들지 않고 비용 항목을 계산할 수 있는지만 묻는다.',
    purpose: '매출총이익 주장과 공헌이익을 구분한다.',
    answerBranches: '계산할 수 있어도 숫자 확인 전에는 수익성을 확정하지 않는다. 모르면 질문을 끝낸다.',
    unchangedWhen: '비용 원장 없이 계산 가능하다고만 말하면 수익성 확정으로 바꾸지 않는다.',
    choices: [
      { id: 'can', label: '비용 항목까지 계산할 수 있다', grade: 'founder_estimate' },
      { id: 'cannot', label: '마진은 있으나 그 비용은 모른다', grade: 'unknown' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function lmulmResaleQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-lmulm-resale',
    hypothesisId: 'h-resale',
    prompt: '리셀 거래가 실제로 발생하고 있습니까? 문서는 리셀 수수료를 예정으로 적습니다.',
    whyDifferent: '수수료 모델이나 모회사 의존도 다음의 질문이다. 예정 문장을 현재 거래로 읽지 않는다.',
    purpose: '리셀 가설과 발생한 거래를 분리한다.',
    answerBranches: '없다는 답은 예정 상태를 유지한다. 발생했다는 답도 거래 원장 전에는 진술이다.',
    unchangedWhen: '거래 건수 원장이 없으면 리셀 플랫폼이 작동 중이라고 바꾸지 않는다.',
    choices: [
      { id: 'none', label: '아직 없다', grade: 'founder_estimate' },
      { id: 'test_only', label: '테스트 거래만 있다', grade: 'founder_estimate' },
      { id: 'happening', label: '거래가 발생하고 있다고 본다', grade: 'founder_estimate' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function lmulmMixSplitQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-lmulm-mix-split',
    hypothesisId: 'h-past-transaction',
    prompt: '기타로 적은 매출을 주문 원장에서 채널별로 나눌 수 있습니까?',
    whyDifferent: '기타는 채널이 아니다. 비중을 다시 고르게 하지 않고 나눌 자료가 있는지만 묻는다.',
    purpose: '기타 답을 매출 구성의 사실로 두지 않는다.',
    answerBranches: '나눌 수 있으면 재구매 추적으로 넘어간다. 없거나 모르면 질문을 끝낸다.',
    unchangedWhen: '원장이 없으면 기타 매출의 비중을 만들지 않는다.',
    choices: [
      { id: 'can', label: '채널별로 나눌 수 있다', grade: 'founder_estimate' },
      { id: 'cannot', label: '나눌 자료가 없다', grade: 'unknown' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function lmulmOutsideQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-lmulm-outside',
    hypothesisId: 'h-past-transaction',
    prompt: '모회사 채널 밖에서 고객을 확보한 기록이 있습니까?',
    whyDifferent: '모회사 지원이 크다는 답 다음이다. 회원 2,000만 명은 모회사 회원수이므로 독립 고객 기록만 묻는다.',
    purpose: '관계사 의존과 독립 고객 확보를 분리한다.',
    answerBranches: '기록이 있다는 답도 원장 전에는 진술이다. 없으면 독립 채널 실험이 다음 행동이다.',
    unchangedWhen: '모회사 회원수나 예상 납품액을 독립 고객 확보로 세지 않는다.',
    choices: [
      { id: 'have_outside', label: '모회사 밖 고객 기록이 있다', grade: 'founder_estimate' },
      { id: 'none', label: '없다', grade: 'unknown' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function ridmPayerQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-ridm-payers',
    hypothesisId: 'h-payer',
    prompt: '현재 돈을 지불한 고객이 있습니까?',
    whyDifferent: '문서는 Pre-revenue와 유료화 예정을 적는다. 시장 규모와 MAU 목표를 먼저 묻지 않는다.',
    purpose: 'Pre-revenue와 미래 매출 가정을 분리한다.',
    answerBranches: '아직 없거나 모르면 9,900원 지불 이유를 묻는다. 유료 고객이 있다고 하면 전환율 3%가 실측인지 묻는다.',
    unchangedWhen: '유료 결제 원문이 없으면 ARR과 전환율을 실적으로 바꾸지 않는다.',
    choices: [
      { id: 'none', label: '아직 없다', grade: 'founder_estimate' },
      { id: 'test_only', label: '테스트 결제만 있다', grade: 'founder_estimate' },
      { id: 'some', label: '일부 유료 사용자가 있다', grade: 'founder_estimate' },
      { id: 'repeat', label: '반복 결제 사용자가 있다', grade: 'founder_estimate' },
      { id: 'enterprise', label: '기업 고객이 지불하고 있다', grade: 'founder_estimate' },
      { id: 'have_payer', label: '유료 결제 고객이 있다고 본다', grade: 'founder_estimate' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function ridmWtpQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-ridm-wtp',
    hypothesisId: 'h-payer',
    prompt: '월 9,900원을 낼 이유를 고객에게 확인했습니까?',
    whyDifferent: '유료 고객이 없거나 확인되지 않았다. 시장 규모 대신 문서의 구독 단가가 지불 의사인지를 묻는다.',
    purpose: '구독 가격 가정과 가격 수용성을 분리한다.',
    answerBranches: '아직 확인하지 않으면 질문을 끝낸다. 실험을 말했다면 12개월 우선 수익모델 하나를 고르게 한다.',
    unchangedWhen: '확인하지 못한 가격은 지불 의사가 아니다. 전환율 3%를 실측으로 만들지 않는다.',
    choices: [
      { id: 'not_yet', label: '아직 확인하지 못했다', grade: 'unknown' },
      { id: 'interest_only', label: '관심은 있으나 가격은 확인하지 않았다', grade: 'founder_estimate' },
      { id: 'one_url', label: '캐릭터 URL 하나의 지불 의사만 물을 계획이다', grade: 'founder_estimate' },
      { id: 'price_shown', label: '가격을 제시하고 반응을 봤다', grade: 'founder_estimate' },
      { id: 'other', label: '기타', grade: 'founder_estimate' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function ridmConversionQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-ridm-conversion',
    hypothesisId: 'h-payer',
    prompt: '문서의 유료 전환율 3%는 실측입니까, 가정입니까?',
    whyDifferent: '유료 고객이 있다는 진술 다음이다. 그 진술을 전환율 목표의 달성으로 읽지 않는다.',
    purpose: '목표 전환율과 실측을 구분한다.',
    answerBranches: '측정하지 않았거나 가정이면 질문을 끝낸다. 측정했다는 답은 비용 질문으로 넘어가되 원장 검증은 아니다.',
    unchangedWhen: '측정 원문이 없으면 3%를 달성 전환율로 바꾸지 않는다.',
    choices: [
      { id: 'not_measured', label: '측정한 적 없다', grade: 'unknown' },
      { id: 'assumption', label: '가정이다', grade: 'founder_estimate' },
      { id: 'benchmark', label: '유사 서비스 수치를 가져온 것이다', grade: 'founder_estimate' },
      { id: 'measured', label: '직접 측정했다고 본다', grade: 'founder_estimate' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function ridmFocusQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-ridm-focus',
    hypothesisId: 'h-payer',
    prompt: '향후 12개월 동안 가장 먼저 검증할 수익모델 하나는 무엇입니까?',
    whyDifferent: '문서에는 구독, 수수료, 후원, 마켓, 광고, B2B가 함께 있다. 복수 선택은 받지 않는다.',
    purpose: '먼저 검증할 수익모델 하나를 고른다.',
    answerBranches: '하나를 골라도 그 모델의 매출이 생긴 것은 아니다. 고른 뒤 질문을 끝낸다.',
    unchangedWhen: '선택 결과는 가설이다. 나머지 수익모델 문장을 문서에서 지우지 않는다.',
    choices: [
      { id: 'saas', label: 'B2C 구독', grade: 'founder_estimate' },
      { id: 'character_fee', label: '캐릭터 구독 수수료', grade: 'founder_estimate' },
      { id: 'b2b', label: 'B2B AI 구축', grade: 'founder_estimate' },
      { id: 'ads', label: '광고', grade: 'founder_estimate' },
      { id: 'market', label: '3D 크리에이터 마켓', grade: 'founder_estimate' },
      { id: 'support', label: '후원·팬덤', grade: 'founder_estimate' },
      { id: 'other', label: '기타', grade: 'founder_estimate' },
      { id: 'unknown', label: '모름', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}

function ridmCostQuestion(): NextQuestion {
  return ask({
    uncertaintyId: 'u-ridm-cost',
    hypothesisId: 'h-cost',
    prompt: '유료 고객 한 명의 추론·인프라 비용을 알고 있나?',
    whyDifferent: '전환율을 측정했다는 진술 다음이다. 매출 가정과 고객당 비용을 분리한다.',
    purpose: '단위경제를 전환율 진술과 분리한다.',
    answerBranches: '모른다는 답은 사용량, 모델, 인프라 비용 측정으로 넘기고 질문을 끝낸다.',
    unchangedWhen: '비용 측정 기록이 없으면 수익성 판단을 바꾸지 않는다.',
    choices: [
      { id: 'know', label: '고객당 추론 비용을 알고 있다', grade: 'founder_estimate' },
      { id: 'unknown', label: '고객당 추론 비용을 모른다', grade: 'unknown' },
      { id: 'unchecked', label: '아직 확인하지 않음', grade: 'unknown' },
    ],
  });
}
