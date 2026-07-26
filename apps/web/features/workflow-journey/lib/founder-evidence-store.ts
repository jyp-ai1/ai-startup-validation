const EVIDENCE_KEY = 'll_founder_evidence_v1';

export type FounderEvidenceCategory = 'customer' | 'pricing' | 'market' | 'competitor';

export type FounderEvidenceEntry = {
  id: string;
  category: FounderEvidenceCategory;
  title: string;
  summary: string;
  insight: string;
  confidenceImpact: number;
  sourceActionId: string;
  createdAt: string;
};

export function loadFounderEvidence(projectId: string): FounderEvidenceEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EVIDENCE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, FounderEvidenceEntry[]>;
    return all[projectId] ?? [];
  } catch {
    return [];
  }
}

export function appendFounderEvidence(
  projectId: string,
  entry: Omit<FounderEvidenceEntry, 'id' | 'createdAt'>,
): FounderEvidenceEntry {
  const created: FounderEvidenceEntry = {
    ...entry,
    id: `ev-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const existing = loadFounderEvidence(projectId);
  const next = [created, ...existing].slice(0, 20);
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(EVIDENCE_KEY);
      const all = raw ? (JSON.parse(raw) as Record<string, FounderEvidenceEntry[]>) : {};
      all[projectId] = next;
      localStorage.setItem(EVIDENCE_KEY, JSON.stringify(all));
    } catch {
      // non-blocking
    }
  }
  return created;
}

export function synthesizeEvidenceFromAnswers(
  actionId: string,
  kind: string,
  answers: string[],
  goImpact: number,
): Omit<FounderEvidenceEntry, 'id' | 'createdAt'> {
  const combined = answers.join(' ');
  const count = answers.length;
  const priceConcern = /비싸|가격|부담|expensive|price|costly|부담스/i.test(combined);
  const positive = /좋|만족|추천|useful|helpful|괜찮/i.test(combined);

  if (kind === 'pricing' || (kind === 'interview' && priceConcern)) {
    return {
      category: 'pricing',
      title: '가격 검증',
      summary: priceConcern
        ? `고객 ${count}명 중 ${Math.max(1, count - 1)}명이 가격 부담을 언급`
        : `고객 ${count}명 가격 인터뷰 완료`,
      insight: answers[0]?.slice(0, 160) ?? '가격 관련 피드백 수집',
      confidenceImpact: goImpact + 2,
      sourceActionId: actionId,
    };
  }

  if (kind === 'competitor') {
    return {
      category: 'competitor',
      title: '경쟁 분석',
      summary: `경쟁 환경 ${count}건 기록`,
      insight: answers[0]?.slice(0, 160) ?? '경쟁 차별화 포인트 수집',
      confidenceImpact: goImpact + 1,
      sourceActionId: actionId,
    };
  }

  if (kind === 'interview' || kind === 'generic') {
    return {
      category: 'customer',
      title: '고객 검증',
      summary: positive
        ? `고객 ${count}명 인터뷰 — 긍정 신호 확인`
        : `고객 ${count}명 인터뷰 완료`,
      insight: answers[0]?.slice(0, 160) ?? '고객 니즈 피드백 수집',
      confidenceImpact: goImpact + 2,
      sourceActionId: actionId,
    };
  }

  return {
    category: 'market',
    title: '사업 검증',
    summary: `${count}건 실행 기록`,
    insight: answers[0]?.slice(0, 160) ?? '실행 결과 기록',
    confidenceImpact: goImpact,
    sourceActionId: actionId,
  };
}
