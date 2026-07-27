import type { DecisionMemoryEntry } from './v2-decision-memory-store';

export type GrowthChapter = {
  id: string;
  monthLabel: string;
  headline: string;
  outcome?: string;
  detail: string;
};

/** Project growth story — month chapters, not timeline dots. */
export const MOCK_GROWTH_CHAPTERS: GrowthChapter[] = [
  {
    id: 'jun',
    monthLabel: '6월',
    headline: '시장성 낮음',
    detail: '초기 아이디어 입력 · AI 첫 시장 스캔',
  },
  {
    id: 'jul',
    monthLabel: '7월',
    headline: '고객 변경',
    outcome: '시장성 상승',
    detail: '예비창업자 → 스타트업 대표 · B2B 검색량 +18%',
  },
  {
    id: 'aug',
    monthLabel: '8월',
    headline: '가격 검증 진행',
    detail: '수익성 Evidence 수집 · 경쟁사 가격 비교',
  },
  {
    id: 'sep',
    monthLabel: '9월',
    headline: '가격 검증 완료',
    outcome: 'GO 검토 가능',
    detail: '가격 가설 확정 · Decision Memory 저장',
  },
];

export function buildProjectGrowthStory(
  entries: DecisionMemoryEntry[],
  reviewCount: number,
): GrowthChapter[] {
  if (reviewCount === 0) return [];

  const chapters = [...MOCK_GROWTH_CHAPTERS];

  if (entries.length > 0) {
    const latest = entries[0];
    chapters.push({
      id: `memory-${latest.id}`,
      monthLabel: '최근',
      headline: latest.decision.slice(0, 40),
      detail: latest.reason ?? '대표 결정 저장',
    });
  }

  return chapters;
}
