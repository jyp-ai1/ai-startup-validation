import type { SiValidationKind } from '@repo/types/domain/strategic-intelligence';

export const E2E_GATE_CASES = ['lmulm', 'clinicflow', 'fitbridge'] as const;
export type SiE2eGateCaseId = (typeof E2E_GATE_CASES)[number];

/** LMULM — C2C 재판매 2차 증거. 18명 / 9건 유지. */
export const LMULM_SECOND_ANSWER =
  '같은 구매 코호트에서 18명이 실제 재판매를 등록했고 9건이 거래됐다.';

/** 클리닉플로우 — 유료 병원 재결제·리콜 재사용. 재판매 금지. */
export const CLINICFLOW_SECOND_ANSWER =
  '기존 유료 병원 2건이 다음 달에도 월 구독을 결제했고 리콜 시나리오를 두 번째로 유료로 사용했다.';

/** 핏브릿지 — 유료 브랜드 위젯 재결제·핏 추천 재사용. 재판매 금지. */
export const FITBRIDGE_SECOND_ANSWER =
  '기존 유료 브랜드 2건이 다음 분기에도 사이즈 위젯을 결제했고 핏 추천을 두 번째로 유료로 사용했다.';

export function secondTurnAnswerForCase(id: SiE2eGateCaseId): string {
  if (id === 'lmulm') return LMULM_SECOND_ANSWER;
  if (id === 'clinicflow') return CLINICFLOW_SECOND_ANSWER;
  return FITBRIDGE_SECOND_ANSWER;
}

/**
 * 2차 답이 해당 사업의 t1 검증 대상과 맞는지.
 * 클리닉/핏브릿지에 LMULM 재판매를 넣으면 false.
 */
export function answerFitsValidationAsk(input: {
  caseId: SiE2eGateCaseId;
  kind: SiValidationKind;
  answer: string;
}): boolean {
  const answer = input.answer.replace(/\s+/g, ' ').trim();
  if (!answer) return false;

  if (input.kind === 'repeat_loop') {
    if (input.caseId === 'lmulm') {
      return (
        /18명/.test(answer) &&
        /9건/.test(answer) &&
        /재판매/.test(answer) &&
        /등록했/.test(answer)
      );
    }
    if (input.caseId === 'clinicflow') {
      return (
        /병원/.test(answer) &&
        /리콜|구독/.test(answer) &&
        /(결제했|유료로 사용)/.test(answer) &&
        !/재판매/.test(answer)
      );
    }
    if (input.caseId === 'fitbridge') {
      return (
        /브랜드/.test(answer) &&
        /사이즈|핏|위젯/.test(answer) &&
        /(결제했|유료로 사용)/.test(answer) &&
        !/재판매/.test(answer)
      );
    }
  }

  if (input.kind === 'paid_conversion') {
    return /(결제했|유료)/.test(answer) && !/재판매/.test(answer);
  }

  return false;
}
