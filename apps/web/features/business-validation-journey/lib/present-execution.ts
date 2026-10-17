const ROLE_LABEL: Record<string, string> = {
  customer: '고객',
  problem: '문제',
  solution: '해결책',
  payer: '지불자',
  revenue: '수익',
  business: '사업',
  answer: '과거 답변',
};

export function contextRoleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

export function executionBadgeLabel(
  kind: 'research' | 'counterReview' | 'judgment',
  status: string,
): string {
  if (kind === 'research') {
    if (status === 'research_completed') return '조사 기록 있음';
    if (status === 'research_failed') return '조사 실패';
    return '조사 미실행';
  }
  if (kind === 'counterReview') {
    if (status === 'counter_review_completed') return '반대 검토 기록 있음';
    if (status === 'counter_review_failed') return '반대 검토 실패';
    return '반대 검토 미실행';
  }
  if (status === 'judgment_provisional') return '잠정 판단';
  return '판단 유보';
}
