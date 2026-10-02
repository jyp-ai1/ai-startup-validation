import type { InputPerturbationType } from './input-perturbation-types';

/** User utterances for lab sessions — business-agnostic unless noted. */
export function userAnswerForPerturbation(
  perturbation: InputPerturbationType,
  turn: number,
  bizLabel: string,
): string {
  if (perturbation === 'mixed') {
    const seq = [
      `핵심 고객은 ${bizLabel} 사용자입니다.`,
      '대표가 구매하고 팀이 매일 사용합니다.',
      '경쟁사는 네이버웍스입니다.',
      '아마 구독료를 낼 것 같지만 검증은 없습니다.',
    ];
    return seq[turn - 1] ?? seq[seq.length - 1]!;
  }

  const map: Record<InputPerturbationType, string> = {
    normal: `핵심 고객은 ${bizLabel}을(를) 위한 사용자이며, 구체 페르소나를 정의 중입니다.`,
    sparse: '중소기업입니다.',
    verbose:
      '여러 채널 리드 중 운영팀과 대표가 함께 고민하며, 결국 10~50명 규모 팀의 의사결정자가 핵심 고객입니다.',
    multi_fact: '대표가 구매하고 직원이 매일 사용하며 지금은 엑셀로 관리합니다.',
    off_slot: '월 매출 3천만원이고 경쟁사는 배달앱입니다.',
    contradiction: turn >= 2 ? 'B2C 일반 소비자가 최종 고객입니다.' : '소규모 음식점 사장님이 핵심 고객입니다.',
    unsupported_claim: '시장 100조이고 무조건 1위가 될 압도적 기술입니다.',
    uncertainty: '아마 고객들이 월 구독료를 낼 것 같지만 아직 검증은 없습니다.',
    correction: '아까 답변을 수정할게요. 실제 고객은 대기업이 아니라 중소 제조사입니다.',
    refusal: '아직 모르겠습니다.',
    repeated: '아까 말씀드렸듯이 동일한 고객층입니다.',
    mixed: '',
  };
  return map[perturbation];
}
