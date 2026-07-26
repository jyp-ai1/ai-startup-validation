import type { StrategyPipelineResult } from '@repo/agents';

export type ResearchInsightItem = {
  id: string;
  name: string;
  insight: string;
  category: 'competitor' | 'market' | 'customer' | 'pricing' | 'government' | 'trend' | 'investment';
};

const DEFAULT_COMPETITOR_INSIGHTS: ResearchInsightItem[] = [
  {
    id: 'comp-kmong',
    name: '크몽',
    insight: '서비스 자동화·외주 마켓플레이스 기능 제공',
    category: 'competitor',
  },
  {
    id: 'comp-soomgo',
    name: '숨고',
    insight: 'AI PM 기능 없음 · 로컬 서비스 매칭 중심',
    category: 'competitor',
  },
  {
    id: 'comp-notion',
    name: '노션',
    insight: '문서·협업 중심 · 창업 검증 루프 부재',
    category: 'competitor',
  },
  {
    id: 'comp-idus',
    name: '아이디어스',
    insight: '메이커 커뮤니티 · AI PM 운영 기능 없음',
    category: 'competitor',
  },
  {
    id: 'comp-startup',
    name: '스타트업 툴킷',
    insight: '템플릿·체크리스트 중심 · 실시간 AI PM 없음',
    category: 'competitor',
  },
];

const DOMAIN_CATEGORY: Record<string, ResearchInsightItem['category']> = {
  market: 'market',
  customer: 'customer',
  competitor: 'competitor',
  trend: 'trend',
  pricing: 'pricing',
  government: 'government',
  investment: 'investment',
};

function parseNamedInsights(text: string, category: ResearchInsightItem['category']): ResearchInsightItem[] {
  const segments = text
    .split(/[.;·•\n]|(?<=[가-힣])\s*(?=[가-힣A-Za-z0-9])/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 4);

  const parsed: ResearchInsightItem[] = [];

  for (const segment of segments) {
    const colonMatch = segment.match(/^([^:：]{2,24})[:：]\s*(.+)$/);
    if (colonMatch) {
      parsed.push({
        id: `parsed-${category}-${parsed.length}`,
        name: colonMatch[1].trim(),
        insight: colonMatch[2].trim(),
        category,
      });
      continue;
    }

    const dashMatch = segment.match(/^([^—–-]{2,24})[-—–]\s*(.+)$/);
    if (dashMatch) {
      parsed.push({
        id: `parsed-${category}-${parsed.length}`,
        name: dashMatch[1].trim(),
        insight: dashMatch[2].trim(),
        category,
      });
    }
  }

  return parsed;
}

function findingToInsight(
  finding: StrategyPipelineResult['research']['findings'][number],
  index: number,
): ResearchInsightItem {
  const category = DOMAIN_CATEGORY[finding.domain] ?? 'market';
  const parsed = parseNamedInsights(finding.summary, category);
  if (parsed.length === 1) return parsed[0];

  return {
    id: `finding-${finding.domain}-${index}`,
    name: finding.title,
    insight: finding.summary,
    category,
  };
}

export function buildResearchInsightItems(
  pipeline: StrategyPipelineResult | null,
): ResearchInsightItem[] {
  if (!pipeline) return DEFAULT_COMPETITOR_INSIGHTS;

  const items: ResearchInsightItem[] = [];
  const competitorFinding = pipeline.research.findings.find((finding) => finding.domain === 'competitor');
  const competitorParsed = competitorFinding
    ? parseNamedInsights(competitorFinding.summary, 'competitor')
    : [];

  if (competitorParsed.length >= 2) {
    items.push(...competitorParsed.slice(0, 5));
  } else {
    items.push(...DEFAULT_COMPETITOR_INSIGHTS);
  }

  for (const [index, finding] of pipeline.research.findings.entries()) {
    if (finding.domain === 'competitor') continue;

    const parsed = parseNamedInsights(finding.summary, DOMAIN_CATEGORY[finding.domain] ?? 'market');
    if (parsed.length >= 1) {
      items.push(...parsed.slice(0, 2));
      continue;
    }

    items.push(findingToInsight(finding, index));
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}:${item.insight.slice(0, 24)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
