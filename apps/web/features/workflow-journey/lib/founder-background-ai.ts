import type { IntelligencePlatformResult, StrategyPipelineResult } from '@repo/agents';

import { saveAgentPipelineResult } from '@/lib/agents/agent-run-store';

import type { DailyChangeItem } from './founder-daily-ceo-loop';
import type { WhatChangedItem } from './founder-daily-ceo-habit';
import type { BusinessDeltaJudgment } from './founder-intelligence-engine';

export type OvernightInvestigationSnapshot = {
  projectId: string;
  runDate: string;
  ranAt: string;
  providerId: string;
  investigationCount: number;
  importantCount: number;
  importantItems: DailyChangeItem[];
  reportItems: DailyChangeItem[];
  morningChanges: DailyChangeItem[];
  whatChanged: WhatChangedItem[];
  fromRealRun: boolean;
};

const SCAN_DOMAINS = [
  'competitor',
  'government',
  'market',
  'trend',
  'pricing',
  'investment',
  'news',
] as const;

const REPORT_KEYS: DailyChangeItem[] = [
  { id: 'scan-market', messageKey: 'marketResearch' },
  { id: 'scan-grant', messageKey: 'grantCheck' },
  { id: 'scan-competitor', messageKey: 'competitorPriceCollect' },
  { id: 'scan-news', messageKey: 'newsAnalysis' },
  { id: 'scan-trend', messageKey: 'searchTrendCheck' },
  { id: 'scan-pricing', messageKey: 'pricingTrack' },
  { id: 'scan-investment', messageKey: 'investmentNews' },
];

function daySeed(projectId: string, date: string): number {
  let hash = 0;
  for (const char of `${projectId}:${date}`) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function deltaToMorningChange(delta: BusinessDeltaJudgment): DailyChangeItem {
  if (delta.category === 'competitor') {
    return { id: `morning-${delta.id}`, messageKey: 'competitorPriceChanged' };
  }
  if (delta.category === 'government') {
    return { id: `morning-${delta.id}`, messageKey: 'grantAdded' };
  }
  if (delta.category === 'market') {
    return { id: `morning-${delta.id}`, messageKey: 'searchVolumeUp' };
  }
  return { id: `morning-${delta.id}`, messageKey: 'interviewCompleted' };
}

function deltaToWhatChanged(delta: BusinessDeltaJudgment, index: number): WhatChangedItem {
  const positiveKeys: Record<string, string> = {
    competitor: 'competitorAdded',
    market: 'searchVolumeUp',
    government: 'grantAdded',
    investment: 'searchVolumeUp',
  };
  const negativeKeys: Record<string, string> = {
    competitor: 'competitorPriceDrop',
    government: 'grantDeadlineSoon',
    market: 'marketNoiseUp',
    investment: 'marketNoiseUp',
  };
  const tone = delta.goImpact >= 3 ? 'positive' : index % 2 === 0 ? 'positive' : 'negative';
  const messageKey =
    tone === 'positive'
      ? (positiveKeys[delta.category] ?? 'competitorAdded')
      : (negativeKeys[delta.category] ?? 'marketNoiseUp');
  return {
    id: `wc-${delta.id}`,
    messageKey,
    tone,
    params: messageKey === 'grantDeadlineSoon' ? { days: 3 } : undefined,
  };
}

function deltaToImportantItem(delta: BusinessDeltaJudgment): DailyChangeItem {
  const keys: Record<string, string> = {
    competitor: 'competitorChangeImportant',
    government: 'grantNewImportant',
    market: 'marketChangeImportant',
    investment: 'investmentNewsImportant',
  };
  return {
    id: `important-${delta.id}`,
    messageKey: keys[delta.category] ?? 'marketChangeImportant',
  };
}

export function buildSnapshotFromIntelligencePlatform(
  projectId: string,
  intelligence: IntelligencePlatformResult,
  pipeline?: StrategyPipelineResult | null,
): OvernightInvestigationSnapshot {
  if (pipeline) {
    const base = buildSnapshotFromPipeline(projectId, pipeline);
    return {
      ...base,
      investigationCount: Math.max(base.investigationCount, intelligence.investigationCount),
      importantCount: Math.max(base.importantCount, intelligence.importantCount),
      fromRealRun: intelligence.reports.some((report) => report.fromRealRun) || base.fromRealRun,
      providerId: intelligence.providerId,
      ranAt: intelligence.completedAt,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const importantReports = intelligence.reports
    .filter((report) => report.confidence >= 68)
    .slice(0, 3);

  return {
    projectId,
    runDate: today,
    ranAt: intelligence.completedAt,
    providerId: intelligence.providerId,
    investigationCount: intelligence.investigationCount,
    importantCount: intelligence.importantCount,
    importantItems: importantReports.map((report) => ({
      id: `important-${report.domain}`,
      messageKey:
        report.domain === 'competitor'
          ? 'competitorChangeImportant'
          : report.domain === 'government'
            ? 'grantNewImportant'
            : 'marketChangeImportant',
    })),
    reportItems: REPORT_KEYS,
    morningChanges: intelligence.reports.slice(0, 3).map((report) => ({
      id: `morning-${report.domain}`,
      messageKey:
        report.domain === 'competitor'
          ? 'competitorPriceChanged'
          : report.domain === 'government'
            ? 'grantAdded'
            : 'searchVolumeUp',
    })),
    whatChanged: buildSimulatedWhatChanged(projectId, today),
    fromRealRun: intelligence.reports.some((report) => report.fromRealRun),
  };
}

export function buildSnapshotFromPipeline(
  projectId: string,
  result: StrategyPipelineResult,
): OvernightInvestigationSnapshot {
  const today = new Date().toISOString().slice(0, 10);
  const deltas = result.founderOs?.businessDeltas ?? [];
  const sourceCount = result.research.sources.length;
  const findingCount = result.research.findings.length;
  const domainScans = SCAN_DOMAINS.filter((domain) =>
    result.research.findings.some((finding) => finding.domain === domain),
  ).length;
  const investigationCount = Math.max(
    12,
    sourceCount + findingCount + domainScans + REPORT_KEYS.length,
  );

  const importantDeltas = deltas.filter((delta) => delta.goImpact >= 3);
  const importantCount = Math.min(3, Math.max(importantDeltas.length, deltas.length > 0 ? 1 : 0));
  const importantItems =
    importantDeltas.length > 0
      ? importantDeltas.slice(0, 3).map(deltaToImportantItem)
      : deltas.slice(0, importantCount).map(deltaToImportantItem);

  const morningChanges =
    deltas.length >= 3
      ? deltas.slice(0, 3).map(deltaToMorningChange)
      : REPORT_KEYS.slice(0, 3).map((item) => ({ ...item, id: `morning-${item.id}` }));

  const whatChanged =
    deltas.length > 0
      ? deltas.slice(0, 3).map((delta, index) => deltaToWhatChanged(delta, index))
      : buildSimulatedWhatChanged(projectId, today);

  return {
    projectId,
    runDate: today,
    ranAt: result.completedAt ?? new Date().toISOString(),
    providerId: result.research.providerId ?? 'openrouter',
    investigationCount,
    importantCount,
    importantItems,
    reportItems: REPORT_KEYS,
    morningChanges,
    whatChanged,
    fromRealRun: result.research.providerId !== 'mock',
  };
}

function buildSimulatedWhatChanged(projectId: string, date: string): WhatChangedItem[] {
  const seed = daySeed(projectId, date);
  const pool: WhatChangedItem[] = [
    { id: 'wc-competitor', messageKey: 'competitorAdded', tone: 'positive' },
    { id: 'wc-search', messageKey: 'searchVolumeUp', tone: 'positive' },
    { id: 'wc-grant', messageKey: 'grantAdded', tone: 'positive' },
    { id: 'wc-deadline', messageKey: 'grantDeadlineSoon', tone: 'negative', params: { days: 3 } },
  ];
  return [pool[seed % pool.length]!, pool[(seed + 3) % pool.length]!, pool[(seed + 7) % 3 + 1]!];
}

export function buildSimulatedOvernightSnapshot(projectId: string): OvernightInvestigationSnapshot {
  const today = new Date().toISOString().slice(0, 10);
  const seed = daySeed(projectId, today);
  const investigationCount = 14 + (seed % 6);
  const importantCount = 2 + (seed % 2);

  return {
    projectId,
    runDate: today,
    ranAt: new Date().toISOString(),
    providerId: 'scheduled',
    investigationCount,
    importantCount,
    importantItems: [
      { id: 'imp-competitor', messageKey: 'competitorChangeImportant' },
      { id: 'imp-grant', messageKey: 'grantNewImportant' },
      { id: 'imp-market', messageKey: 'marketChangeImportant' },
    ].slice(0, importantCount),
    reportItems: REPORT_KEYS,
    morningChanges: REPORT_KEYS.slice(0, 3).map((item) => ({
      ...item,
      id: `morning-${item.id}`,
    })),
    whatChanged: buildSimulatedWhatChanged(projectId, today),
    fromRealRun: false,
  };
}

export type OvernightRunRequest = {
  projectId: string;
  projectTitle: string;
  ideaSummary: string;
  goalId: string;
  locale?: string;
  previousSuccessScore?: number;
};

export async function runOvernightInvestigation(
  request: OvernightRunRequest,
): Promise<OvernightInvestigationSnapshot> {
  try {
    const response = await fetch('/api/background-ai/overnight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      data?: { snapshot: OvernightInvestigationSnapshot; pipeline: StrategyPipelineResult };
    };
    if (response.ok && payload.success && payload.data?.snapshot) {
      if (payload.data.pipeline) {
        saveAgentPipelineResult(payload.data.pipeline);
      }
      return payload.data.snapshot;
    }
  } catch {
    // fall through to simulated snapshot
  }
  return buildSimulatedOvernightSnapshot(request.projectId);
}

export function mergeHabitWithOvernightSnapshot(
  snapshot: OvernightInvestigationSnapshot | null,
  fallbackMorning: DailyChangeItem[],
  fallbackWhatChanged: WhatChangedItem[],
  fallbackReport: DailyChangeItem[],
): {
  morningChanges: DailyChangeItem[];
  whatChanged: WhatChangedItem[];
  overnightReport: DailyChangeItem[];
  investigationSummary: { total: number; important: number; items: DailyChangeItem[] } | null;
} {
  if (!snapshot) {
    return {
      morningChanges: fallbackMorning,
      whatChanged: fallbackWhatChanged,
      overnightReport: fallbackReport,
      investigationSummary: null,
    };
  }
  return {
    morningChanges: snapshot.morningChanges,
    whatChanged: snapshot.whatChanged,
    overnightReport: snapshot.reportItems,
    investigationSummary: {
      total: snapshot.investigationCount,
      important: snapshot.importantCount,
      items: snapshot.importantItems,
    },
  };
}
