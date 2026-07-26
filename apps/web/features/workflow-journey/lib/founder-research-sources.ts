import type { StrategyPipelineResult } from '@repo/agents';

export type ResearchSourceDisplayItem = {
  id: string;
  title: string;
  sourceType: string;
  summary?: string;
  domainLabel?: string;
};

const DOMAIN_LABELS: Record<string, string> = {
  market: '시장',
  customer: '고객',
  competitor: '경쟁사',
  trend: '트렌드',
  pricing: '가격',
  government: '정부지원',
  investment: '투자',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  REPORT: '시장 보고서',
  WEB: '웹 자료',
  NEWS: '뉴스·트렌드',
  GOVERNMENT: '정부지원사업',
  DATABASE: '경쟁사·DB',
};

export function buildResearchSourceItems(
  pipeline: StrategyPipelineResult | null,
): ResearchSourceDisplayItem[] {
  if (!pipeline) return [];

  const findingBySource = new Map<string, string>();
  for (const finding of pipeline.research.findings) {
    for (const sourceId of finding.sourceIds) {
      if (!findingBySource.has(sourceId)) {
        findingBySource.set(sourceId, finding.summary);
      }
    }
  }

  const sourceItems: ResearchSourceDisplayItem[] = pipeline.research.sources.map((source) => ({
    id: source.id,
    title: source.title,
    sourceType: SOURCE_TYPE_LABELS[source.sourceType] ?? source.sourceType,
    summary: findingBySource.get(source.id),
  }));

  const unmatchedFindings = pipeline.research.findings
    .filter((finding) => finding.sourceIds.every((id) => !pipeline.research.sources.some((s) => s.id === id)))
    .map((finding, index) => ({
      id: `finding-${finding.domain}-${index}`,
      title: finding.title,
      sourceType: DOMAIN_LABELS[finding.domain] ?? finding.domain,
      summary: finding.summary,
      domainLabel: DOMAIN_LABELS[finding.domain],
    }));

  return [...sourceItems, ...unmatchedFindings];
}

export function countResearchMaterials(pipeline: StrategyPipelineResult | null): number {
  if (!pipeline) return 0;
  return pipeline.research.sources.length + pipeline.research.findings.length;
}
