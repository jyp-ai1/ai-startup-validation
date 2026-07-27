import type { DecisionMemoryEntry } from './v2-decision-memory-store';

export type GrowthChapter = {
  id: string;
  monthLabel: string;
  headline: string;
  outcome?: string;
  detail?: string;
  isToday?: boolean;
};

const CORE_CHAPTERS: GrowthChapter[] = [
  {
    id: 'jun',
    monthLabel: '6월',
    headline: '시장성 낮음',
  },
  {
    id: 'jul',
    monthLabel: '7월',
    headline: '고객 변경',
    outcome: '시장성 상승',
  },
  {
    id: 'aug',
    monthLabel: '8월',
    headline: '시장성 상승',
  },
];

export function buildProjectGrowthStory(
  entries: DecisionMemoryEntry[],
  reviewCount: number,
): GrowthChapter[] {
  if (reviewCount === 0) return [];

  const chapters: GrowthChapter[] = [...CORE_CHAPTERS];

  chapters.push({
    id: 'today',
    monthLabel: '오늘',
    headline: '가격 검토 필요',
    isToday: true,
  });

  if (entries.length > 0) {
    const latest = entries[0];
    chapters[chapters.length - 1] = {
      id: 'today',
      monthLabel: '오늘',
      headline: latest.decision.slice(0, 36),
      isToday: true,
    };
  }

  return chapters;
}
