import type { JourneyState } from './journey-types';
import { verificationActionFor } from './verification-action';

export function renderVerificationDocument(state: JourneyState): string {
  const plan = state.planCase;
  if (!plan || plan.profile === 'unrecognized') {
    return '사업계획서 세션이 없다. 다운로드할 검증 결과가 없다.';
  }
  const verification = verificationActionFor(state);
  const simulation = plan.provenance === 'test_fixture';
  const answers = state.answers.map((answer) => {
    const stance = answer.grade === 'unknown' ? '미확인' : '가설·진술';
    return `- ${stance}. ${answer.questionText} → ${answer.choiceLabel}${answer.freeText ? ` / ${answer.freeText}` : ''}`;
  });
  const changed = (state.judgmentComparisons ?? []).filter((item) => item.judgmentChanged);
  const unchanged = (state.judgmentComparisons ?? []).filter((item) => !item.judgmentChanged);
  const lines = [
    'ALABOM 검증 메모',
    simulation ? '표시: 시뮬레이션. 테스트 픽스처와 가상 답변이며 실제 매출이나 유료 고객의 증거가 아니다.' : '표시: 사용자가 가져온 문서 주장. 원장 검증이 아니다.',
    '최종 판단: Hold',
    'Go와 Stop은 내리지 않는다. 핵심 가설을 뒷받침하거나 반박하는 계약·거래·결제 기록이 이 세션에 없다.',
    '외부 모델 호출: 없음. 질문 분기는 규칙이다. liveModelCall false.',
    'GPT 1차 답변의 완성도 백분율, 신뢰도, 사업성 점수는 근거가 없어 이 문서에 넣지 않는다. 가정 답변으로 만든 긍정 결론도 채택하지 않는다.',
    '',
    `사업: ${state.intake.business}`,
    `출처: ${plan.sourceLabel}`,
    `판단 문장: ${state.judgmentText}`,
    '',
    '문서 기재',
    ...plan.claims.map((claim) => `- ${claim.text} 상태 ${claim.claimStatus}. 원장 검증 아님.`),
    '',
    '사용자 답변',
    ...(answers.length > 0 ? answers : ['- 아직 없다.']),
    '',
    '검증된 증거',
    '- 없음.',
    '',
    '가설',
    ...plan.unknowns.map((item) => `- ${item}`),
    '',
    '규칙 해석',
    ...plan.support.map((item) => `- 문서에서 읽은 문장: ${item}`),
    ...plan.counter.map((item) => `- 비어 있는 근거: ${item}`),
    '',
    '판단이 바뀐 답',
    ...(changed.length > 0 ? changed.map((item) => `- ${item.reason}`) : ['- 아직 없다.']),
    '',
    '판단 문장을 유지한 답',
    ...(unchanged.length > 0 ? unchanged.map((item) => `- ${item.reason}`) : ['- 아직 없다.']),
    '',
    '잔여 불확실성',
    ...plan.unknowns.map((item) => `- ${item}`),
    plan.exitCondition,
    '',
    '다음 행동',
    verification.action,
    `필요한 자료: ${verification.evidenceNeeded}`,
    '',
    '원문에서 지우지 않은 주장',
    ...plan.claims.map((claim) => `- ${claim.role}: ${claim.text}`),
  ];
  return lines.join('\n');
}
