/**
 * Independent first-pass referee for the same 5 calibration documents.
 * Not an S.I. source of truth. Not copied into the analyzer.
 */

import type { SiStageId, SiVerdictId } from '@repo/types/domain/strategic-intelligence';

import type { SiCalibrationCaseId } from '../si-calibration-cases';

export type FirstPassReferee = {
  id: SiCalibrationCaseId;
  verdictId: SiVerdictId;
  stageBand: SiStageId[];
  executiveJudgment: string;
  whyItCanWin: string;
  whyItCanFail: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  coreRiskPatterns: RegExp[];
  cuPatterns: RegExp[];
  /** If missing, CU is decision-relevant but thinner than GPT/Gemini. */
  cuSpecificPatterns?: RegExp[];
  dcePatterns: RegExp[];
  priorityPatterns: RegExp[];
  forbiddenOptimism: RegExp[];
};

export const FIRST_PASS_REFEREE: Record<SiCalibrationCaseId, FirstPassReferee> = {
  juinjip: {
    id: 'juinjip',
    verdictId: 'judgment_deferred',
    stageBand: ['S0', 'S1', 'S2'],
    executiveJudgment:
      '출시 전이고 결제자와 세그먼트가 가설이므로 사업화 판단을 보류한다.',
    whyItCanWin: '영세 양조장의 온라인 마케팅 공백은 문서에서 확인되는 구체적 문제다.',
    whyItCanFail:
      '관광객(사용자)과 양조장 대표(결제 후보)가 다르고, MZ/FIT 수요와 대표의 지불이 모두 미검증이다. 출시·매출이 없다.',
    criticalUnknown: '양조장 대표가 이 연결을 마케팅비로 살 이유가 있는가.',
    decisionChangingEvidence:
      '대표 1명의 지불 의향 인터뷰 또는 견적·선결제. 수락이면 보류를 조건부 가능 이상으로, 거절이면 보류를 유지한다.',
    validationPriority: '확인된 양조장 대표 한 명에게 유료 제안하고 지불 이유를 듣는다.',
    coreRiskPatterns: [/결제|지불|구매자/, /세그먼트|가설|MZ|FIT/, /출시|매출/],
    cuPatterns: [/결제|지불|돈/],
    dcePatterns: [/지불|결제|견적|계약|선결제|인터뷰/],
    priorityPatterns: [/결제|지불|사용자/],
    forbiddenOptimism: [/사업화 가능성이 높음/],
  },
  lmulm: {
    id: 'lmulm',
    verdictId: 'viable',
    stageBand: ['S3'],
    executiveJudgment:
      '1차 판매·출시·공급이 있어 사업화 가능성은 있다. C2C 반복이 없으면 플랫폼이 아니라 브랜드다.',
    whyItCanWin: '실제 판매 매출, 앱 출시, 공급망, 분사 운영이 있다.',
    whyItCanFail: '재판매가 반복되지 않으면 1차 한정판 판매 브랜드로 남는다.',
    criticalUnknown: 'C2C 재판매가 한 번의 이벤트가 아니라 반복되는가.',
    decisionChangingEvidence:
      '최근 구매 코호트의 재판매 등록·체결·재구매 수치. 있으면 양면 시장으로 올리고, 없으면 브랜드로 내린다.',
    validationPriority: '최근 구매 코호트에서 재판매 등록·체결·재구매 한 가지를 확인한다.',
    coreRiskPatterns: [/재판매|C2C|반복/],
    cuPatterns: [/재판매|C2C|반복/],
    dcePatterns: [/재판매|재구매|거래|등록/],
    priorityPatterns: [/재판매|재구매|코호트/],
    forbiddenOptimism: [],
  },
  ridm: {
    id: 'ridm',
    verdictId: 'judgment_deferred',
    stageBand: ['S0', 'S1', 'S2'],
    executiveJudgment: '콘셉트와 사이트만 있다. 직무와 결제자 없이 사업화 판단을 보류한다.',
    whyItCanWin: '문서에 상업 사실이 거의 없다. 가능성을 만들 근거가 부족하다.',
    whyItCanFail: '챗봇·일기·상담과 차별이 지불로 증명되지 않았다.',
    criticalUnknown: '누가 어떤 직무를 이 제품으로 대체하며 왜 돈을 내는가.',
    decisionChangingEvidence:
      '결제자 한 명이 실제로 지불하고 그 직무를 이 제품으로 대체한 증거. 있으면 보류를 올리고, 없으면 유지한다.',
    validationPriority: '결제자와 Job-to-be-done을 한 쌍으로 확인한다.',
    coreRiskPatterns: [/직무|Job|결제|돈/],
    cuPatterns: [/직무|결제|돈|Job/],
    dcePatterns: [/결제|지불|유료|직무/],
    priorityPatterns: [/결제|직무|Job/],
    forbiddenOptimism: [/사업화 가능성이 높음/],
  },
  clinicflow: {
    id: 'clinicflow',
    verdictId: 'judgment_deferred',
    stageBand: ['S0', 'S1', 'S2'],
    executiveJudgment:
      'no-show 문제는 선명하나 출시 전이고 유료 전환이 없다. 사업화 판단을 보류한다.',
    whyItCanWin:
      'no-show 15–25%, 원장/법인 결제 후보, 과별 패턴+EMR 연동이 대안 대비 포인트다.',
    whyItCanFail:
      '원장이 월 구독을 내지 않거나, EMR·개인정보 연동이 막히거나, 파일럿에서 no-show가 줄지 않으면 사업이 아니다.',
    criticalUnknown: '한 병원이 유료로 쓰고 no-show가 실제로 주는가.',
    decisionChangingEvidence:
      '유료 파일럿 1곳과 전후 no-show. 성과가 있으면 조건부 가능 이상으로, 없으면 보류를 유지한다.',
    validationPriority: '가장 가까운 병원에 유료 제안을 하고 no-show 전후를 잰다.',
    coreRiskPatterns: [/유료|결제|파일럿/, /EMR|개인정보|no-show|노쇼/],
    cuPatterns: [/지불|유료|결제/],
    cuSpecificPatterns: [/no-show|노쇼|병원|리콜/],
    dcePatterns: [/유료|파일럿|결제|성과/],
    priorityPatterns: [/유료|결제|파일럿|제안/],
    forbiddenOptimism: [/사업화 가능성이 높음/, /실제 판매·매출/],
  },
  fitbridge: {
    id: 'fitbridge',
    verdictId: 'judgment_deferred',
    stageBand: ['S0', 'S1', 'S2'],
    executiveJudgment:
      '반품 문제는 크나 출시 전이고 자사 매출이 없다. 연 5–50억은 고객 규모이므로 판단을 보류한다.',
    whyItCanWin: '반품률 30–40%라는 금액 감각과 True Fit 대비 한국 체형·브랜드 실측 차별점.',
    whyItCanFail:
      '브랜드가 위젯에 돈을 내지 않거나 실측 데이터가 없거나 반품이 줄지 않으면 사업이 아니다.',
    criticalUnknown: '브랜드가 위젯에 돈을 내고 반품률이 실제로 주는가.',
    decisionChangingEvidence:
      '브랜드 1곳 PDP A/B와 유료 파일럿. 반품이 줄고 결제가 있으면 올리고, 없으면 보류를 유지한다.',
    validationPriority: '가장 가까운 브랜드에 유료 위젯을 제안하고 반품률을 잰다.',
    coreRiskPatterns: [/유료|결제|파일럿/, /반품|True Fit|체형|실측/],
    cuPatterns: [/지불|유료|결제/],
    cuSpecificPatterns: [/반품|사이즈|위젯|브랜드/],
    dcePatterns: [/유료|파일럿|결제|성과/],
    priorityPatterns: [/유료|결제|파일럿|제안/],
    forbiddenOptimism: [/사업화 가능성이 높음/, /실제 판매·매출/],
  },
};
