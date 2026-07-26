import type { BusinessDeltaJudgment, GeneratedTodayAction } from './founder-intelligence-engine';
import type { FounderEvidenceEntry } from './founder-evidence-store';

export type AiPmInboxItemKind = 'insight' | 'analysis' | 'deadline' | 'action';

export type AiPmInboxItem = {
  id: string;
  kind: AiPmInboxItemKind;
  headlineKey: string;
  headlineParams?: Record<string, string | number>;
  suggestionKey: string;
  suggestionParams?: Record<string, string | number>;
  actionId?: string;
};

const INBOX_CATEGORY_MAP: Record<
  BusinessDeltaJudgment['category'],
  { kind: AiPmInboxItemKind; headlineKey: string; suggestionKey: string }
> = {
  competitor: {
    kind: 'insight',
    headlineKey: 'competitorPrice',
    suggestionKey: 'competitorPriceSuggest',
  },
  market: {
    kind: 'insight',
    headlineKey: 'marketSignal',
    suggestionKey: 'marketSignalSuggest',
  },
  investment: {
    kind: 'deadline',
    headlineKey: 'investmentSignal',
    suggestionKey: 'investmentSignalSuggest',
  },
  government: {
    kind: 'deadline',
    headlineKey: 'grantDeadline',
    suggestionKey: 'grantDeadlineSuggest',
  },
};

export function buildAiPmInboxItems(
  deltas: BusinessDeltaJudgment[],
  evidence: FounderEvidenceEntry[],
  todayActions: GeneratedTodayAction[],
): AiPmInboxItem[] {
  const items: AiPmInboxItem[] = [];

  for (const delta of deltas.slice(0, 2)) {
    const template = INBOX_CATEGORY_MAP[delta.category];
    items.push({
      id: `delta_${delta.id}`,
      kind: template.kind,
      headlineKey: template.headlineKey,
      suggestionKey: template.suggestionKey,
      suggestionParams: { impact: delta.goImpact },
    });
  }

  for (const entry of evidence.slice(-2).reverse()) {
    items.push({
      id: `evidence_${entry.id}`,
      kind: 'analysis',
      headlineKey:
        entry.category === 'customer' ? 'interviewAnalysis' : 'evidenceAnalysis',
      suggestionKey:
        entry.category === 'customer'
          ? 'interviewAnalysisSuggest'
          : 'evidenceAnalysisSuggest',
      suggestionParams: { summary: entry.summary.slice(0, 48) },
    });
  }

  const primary = todayActions[0];
  if (primary) {
    items.push({
      id: `action_${primary.id}`,
      kind: 'action',
      headlineKey: 'todayAction',
      suggestionKey: 'todayActionSuggest',
      suggestionParams: {
        minutes: primary.etaMinutes,
        impact: primary.goImpact,
      },
      actionId: primary.id,
    });
  }

  const fallbacks: AiPmInboxItem[] = [
    {
      id: 'fallback_competitor',
      kind: 'insight',
      headlineKey: 'competitorPrice',
      suggestionKey: 'competitorPriceSuggest',
    },
    {
      id: 'fallback_analysis',
      kind: 'analysis',
      headlineKey: 'interviewAnalysis',
      suggestionKey: 'interviewAnalysisSuggest',
    },
    {
      id: 'fallback_grant',
      kind: 'deadline',
      headlineKey: 'grantDeadline',
      headlineParams: { days: 4 },
      suggestionKey: 'grantDeadlineSuggest',
      suggestionParams: { days: 4 },
    },
  ];

  for (const fallback of fallbacks) {
    if (items.length >= 3) break;
    if (!items.some((item) => item.headlineKey === fallback.headlineKey)) {
      items.push(fallback);
    }
  }

  return items.slice(0, 3);
}
