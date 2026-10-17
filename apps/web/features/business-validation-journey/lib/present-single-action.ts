import type { JourneyState } from './journey-types';
import { verificationActionFor } from './verification-action';

/**
 * Screen reading of the frozen verification paragraph.
 * The rule engine still returns every line. This layer shows the first line only.
 */

const BLOCK_STARTS = [
  '주문 원장에서 모회사·납품 매출과 일반 소비자 매출을 나눈다.',
  '주문 원장에서 매출 2,000만 원의 채널 비중을 나눈다.',
  '재구매율을 추정하지 않는다.',
  '재구매를 추적할 수 있다는 진술을 주문 코호트와 대조한다.',
  '모회사 채널 밖 고객 확보 기록을 찾는다.',
  '상품별 배송, 결제, 반품, 운영비를 뺀 공헌이익을 계산한다.',
  '최초 유료 고객 1명의 결제 원문을 가져온다.',
  '유료 고객이 있다는 진술을 결제 원문과 대조한다.',
  '그 고객의 사용량, 호출한 모델, 인프라 비용을 측정한다.',
  '말한 고객당 비용을 사용량 기록과 대조한다.',
] as const;

const SUCCESS_CRITERIA: ReadonlyArray<{ start: string; criterion: string }> = [
  {
    start: '주문 원장에서 모회사·납품',
    criterion: '주문 원장에서 모회사·납품 매출과 일반 소비자 매출이 나뉜 한 건. 모회사 회원수는 그 원장이 아니다.',
  },
  {
    start: '주문 원장에서 매출 2,000만',
    criterion: '주문 원장에서 매출 2,000만 원의 채널 비중이 나뉜 한 건. 추정으로 채운 비중은 성공이 아니다.',
  },
  {
    start: '재구매율을 추정하지 않는다',
    criterion: '같은 고객의 재주문을 셀 기간과 기준. 재구매율 숫자는 성공이 아니다.',
  },
  {
    start: '재구매를 추적할 수 있다는',
    criterion: '주문 코호트와 대조한 재구매 기록 한 건. 추적할 수 있다는 진술만으로는 성공이 아니다.',
  },
  {
    start: '모회사 채널 밖 고객 확보',
    criterion: '모회사 채널 밖 고객 확보 기록 한 건, 또는 독립 채널 실험 하나의 설계. 모회사 회원수는 그 기록이 아니다.',
  },
  {
    start: '상품별 배송, 결제, 반품, 운영비',
    criterion: '상품별 배송·결제·반품·운영비를 뺀 공헌이익 계산 한 건. 마진 문장만으로는 성공이 아니다.',
  },
  {
    start: '최초 유료 고객 1명',
    criterion: '최초 유료 고객 1명의 결제 원문. 날짜, 금액, 낸 사람이 적혀 있다. 전환율 가정은 실적이 아니다.',
  },
  {
    start: '유료 고객이 있다는 진술',
    criterion: '유료 고객 진술과 맞춘 결제 원문 한 건. 진술만으로는 성공이 아니다.',
  },
  {
    start: '그 고객의 사용량',
    criterion: '그 고객의 사용량, 호출한 모델, 인프라 비용이 적힌 측정 한 건.',
  },
  {
    start: '말한 고객당 비용',
    criterion: '말한 고객당 비용과 맞춘 사용량 기록 한 건. 알고 있다는 진술만으로는 성공이 아니다.',
  },
];

export type SingleDiagnosticAction = {
  action: string;
  successCriterion: string;
  engineBlockCount: number;
};

export function presentSingleDiagnosticAction(state: JourneyState): SingleDiagnosticAction {
  if (state.nextQuestion) {
    return {
      action: state.nextAction.text,
      successCriterion: state.nextAction.successCriterion,
      engineBlockCount: 1,
    };
  }

  const bundled = verificationActionFor(state);
  const blocks = splitVerificationBlocks(bundled.action);
  const action = blocks[0] ?? bundled.action.trim();
  return {
    action,
    successCriterion: blocks.length > 1 ? criterionFor(action) : bundled.evidenceNeeded,
    engineBlockCount: Math.max(blocks.length, 1),
  };
}

function splitVerificationBlocks(action: string): string[] {
  const found = BLOCK_STARTS.map((start) => ({ start, index: action.indexOf(start) }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index);
  if (found.length === 0) return [action.trim()];
  return found.map((item, index) => {
    const end = found[index + 1]?.index ?? action.length;
    return action.slice(item.index, end).trim();
  });
}

function criterionFor(action: string): string {
  const match = SUCCESS_CRITERIA.find((item) => action.startsWith(item.start));
  if (match) return match.criterion;
  const sentence = action.split(/(?<=다\.)\s/)[0]?.trim();
  return sentence || action;
}
