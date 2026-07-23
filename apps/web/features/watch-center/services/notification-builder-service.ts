import 'server-only';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive/services/executive-types';

import type { NotificationSettings, WatchNotification } from '../types';

type BuilderInput = {
  projectId: string;
  stats: ProjectDashboardStats;
  executive?: ExecutiveWorkspaceViewModel | null;
  hasExecutiveReport?: boolean;
  settings: NotificationSettings;
};

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export function buildWorkspaceEventNotifications(input: BuilderInput): WatchNotification[] {
  const { projectId, stats, executive, hasExecutiveReport } = input;
  const items: WatchNotification[] = [];

  if (stats.research.progressPercent >= 100 && stats.research.total > 0) {
    items.push({
      id: `event-research-complete-${projectId}`,
      projectId,
      category: 'AI_RECOMMENDATION',
      priority: 'SUCCESS',
      titleKey: 'events.researchComplete.title',
      summaryKey: 'events.researchComplete.summary',
      href: `/projects/${projectId}/research`,
      read: false,
      occurredAt: hoursAgo(0.5),
    });
  }

  if (stats.evidence.total > 0) {
    items.push({
      id: `event-evidence-added-${projectId}-${stats.evidence.total}`,
      projectId,
      category: 'REMINDER',
      priority: 'INFO',
      titleKey: 'events.evidenceAdded.title',
      summaryKey: 'events.evidenceAdded.summary',
      href: `/projects/${projectId}/evidence`,
      read: false,
      occurredAt: hoursAgo(1),
    });
  }

  if (
    executive &&
    executive.decision.explanation.evidenceCoverage.overallPercent >= 70
  ) {
    items.push({
      id: `event-decision-ready-${projectId}`,
      projectId,
      category: 'DECISION',
      priority: 'SUCCESS',
      titleKey: 'events.decisionReady.title',
      summaryKey: 'events.decisionReady.summary',
      href: `/projects/${projectId}/decision`,
      read: false,
      occurredAt: hoursAgo(0.25),
    });
  }

  if (hasExecutiveReport) {
    items.push({
      id: `event-report-ready-${projectId}`,
      projectId,
      category: 'REPORT',
      priority: 'SUCCESS',
      titleKey: 'events.reportReady.title',
      summaryKey: 'events.reportReady.summary',
      href: `/projects/${projectId}/executive-report`,
      read: false,
      occurredAt: hoursAgo(0.1),
    });
  }

  return items;
}

export function buildSmartReminders(input: BuilderInput): WatchNotification[] {
  const { projectId, stats, executive, hasExecutiveReport, settings } = input;
  if (!settings.reminderEnabled) return [];

  const items: WatchNotification[] = [];
  const decision = executive?.decision;

  if (stats.evidence.total < 3) {
    items.push({
      id: `reminder-evidence-${projectId}`,
      projectId,
      category: 'REMINDER',
      priority: 'WARNING',
      titleKey: 'reminders.evidence.title',
      summaryKey: 'reminders.evidence.summary',
      href: `/projects/${projectId}/evidence`,
      read: false,
      occurredAt: hoursAgo(1),
    });
  }

  if (stats.voc.total < 2) {
    items.push({
      id: `reminder-voc-${projectId}`,
      projectId,
      category: 'REMINDER',
      priority: 'INFO',
      titleKey: 'reminders.voc.title',
      summaryKey: 'reminders.voc.summary',
      href: `/projects/${projectId}/voc`,
      read: false,
      occurredAt: hoursAgo(3),
    });
  }

  if (decision && decision.explanation.evidenceCoverage.overallPercent >= 70) {
    items.push({
      id: `reminder-decision-${projectId}`,
      projectId,
      category: 'REMINDER',
      priority: 'SUCCESS',
      titleKey: 'reminders.decision.title',
      summaryKey: 'reminders.decision.summary',
      href: `/projects/${projectId}/decision`,
      read: false,
      occurredAt: hoursAgo(0.5),
    });
  }

  if (decision && !hasExecutiveReport) {
    items.push({
      id: `reminder-report-${projectId}`,
      projectId,
      category: 'REMINDER',
      priority: 'INFO',
      titleKey: 'reminders.report.title',
      summaryKey: 'reminders.report.summary',
      href: `/projects/${projectId}/report`,
      read: false,
      occurredAt: hoursAgo(2),
    });
  }

  const lastActivity = stats.recentActivity[0]?.occurredAt;
  if (lastActivity) {
    const inactiveDays = (Date.now() - new Date(lastActivity).getTime()) / 86400_000;
    if (inactiveDays >= 30) {
      items.push({
        id: `reminder-inactive-${projectId}`,
        projectId,
        category: 'REMINDER',
        priority: 'CRITICAL',
        titleKey: 'reminders.inactive.title',
        summaryKey: 'reminders.inactive.summary',
        href: `/dashboard?project=${projectId}`,
        read: false,
        occurredAt: daysAgo(Math.floor(inactiveDays)),
      });
    }
  }

  return items;
}

export function buildAiRecommendations(input: BuilderInput): WatchNotification[] {
  const { projectId, executive, settings } = input;
  if (!settings.aiRecommendationEnabled || !executive) return [];

  const confidence = executive.decision.scores.confidence;
  const items: WatchNotification[] = [
    {
      id: `ai-rec-market-${projectId}`,
      projectId,
      category: 'AI_RECOMMENDATION',
      priority: 'INFO',
      titleKey: 'aiRecommendations.marketResearch.title',
      summaryKey: 'aiRecommendations.marketResearch.summary',
      href: `/projects/${projectId}/market`,
      read: false,
      occurredAt: hoursAgo(4),
    },
  ];

  if (confidence >= 75) {
    items.unshift({
      id: `ai-rec-report-${projectId}`,
      projectId,
      category: 'AI_RECOMMENDATION',
      priority: 'SUCCESS',
      titleKey: 'aiRecommendations.report.title',
      summaryKey: 'aiRecommendations.report.summary',
      href: `/projects/${projectId}/report`,
      read: false,
      occurredAt: hoursAgo(1),
    });
  }

  if (executive.decision.explanation.evidenceCoverage.overallPercent < 70) {
    items.unshift({
      id: `ai-rec-evidence-${projectId}`,
      projectId,
      category: 'AI_RECOMMENDATION',
      priority: 'WARNING',
      titleKey: 'aiRecommendations.evidence.title',
      summaryKey: 'aiRecommendations.evidence.summary',
      href: `/projects/${projectId}/evidence`,
      read: false,
      occurredAt: hoursAgo(2),
    });
  }

  return items;
}

export function buildDecisionNotifications(input: BuilderInput): WatchNotification[] {
  const { projectId, executive } = input;
  if (!executive) return [];

  return [
    {
      id: `decision-confidence-${projectId}`,
      projectId,
      category: 'DECISION',
      priority: executive.decision.scores.confidence >= 70 ? 'SUCCESS' : 'WARNING',
      titleKey: 'decision.confidence.title',
      summaryKey: 'decision.confidence.summary',
      href: `/projects/${projectId}/decision`,
      read: false,
      occurredAt: hoursAgo(6),
    },
  ];
}

export function signalsToNotifications(
  projectId: string,
  signals: {
    id: string;
    category: WatchNotification['category'];
    priority: WatchNotification['priority'];
    titleKey: string;
    summaryKey: string;
    href?: string;
  }[],
  settings: NotificationSettings,
): WatchNotification[] {
  return signals.filter((signal) => {
    if (signal.category === 'MARKET') return settings.marketEnabled;
    if (signal.category === 'COMPETITOR') return settings.competitorEnabled;
    if (signal.category === 'GOVERNMENT') return settings.governmentEnabled;
    return true;
  }).map((signal, index) => ({
    id: signal.id,
    projectId,
    category: signal.category,
    priority: signal.priority,
    titleKey: signal.titleKey,
    summaryKey: signal.summaryKey,
    href: signal.href ?? null,
    read: index > 2,
    occurredAt: hoursAgo(index * 5 + 1),
  }));
}

export function mergeNotifications(...groups: WatchNotification[][]): WatchNotification[] {
  const map = new Map<string, WatchNotification>();
  for (const group of groups) {
    for (const item of group) {
      map.set(item.id, item);
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

export function buildDefaultWatchSuggestions(projectId: string) {
  return [
    { id: 'suggest-market-1', watchType: 'MARKET' as const, label: 'Healthcare AI', projectId },
    { id: 'suggest-market-2', watchType: 'MARKET' as const, label: 'Manufacturing AI', projectId },
    { id: 'suggest-market-3', watchType: 'MARKET' as const, label: 'Education AI', projectId },
    { id: 'suggest-competitor-1', watchType: 'COMPETITOR' as const, label: 'OpenAI', projectId },
    { id: 'suggest-competitor-2', watchType: 'COMPETITOR' as const, label: 'Anthropic', projectId },
    { id: 'suggest-competitor-3', watchType: 'COMPETITOR' as const, label: 'Perplexity', projectId },
    { id: 'suggest-government-1', watchType: 'GOVERNMENT' as const, label: 'TIPS', projectId },
    { id: 'suggest-government-2', watchType: 'GOVERNMENT' as const, label: '예창패', projectId },
    { id: 'suggest-government-3', watchType: 'GOVERNMENT' as const, label: 'AI Voucher', projectId },
  ];
}

export function buildAiSummary(
  projectId: string,
  notifications: WatchNotification[],
): import('../types').WatchAiSummary {
  const marketCount = notifications.filter((n) => n.category === 'MARKET').length;
  const competitorCount = notifications.filter((n) => n.category === 'COMPETITOR').length;
  const governmentCount = notifications.filter((n) => n.category === 'GOVERNMENT').length;

  const action =
    notifications.find((n) => n.category === 'AI_RECOMMENDATION' && !n.read) ??
    notifications.find((n) => n.category === 'REMINDER' && !n.read) ??
    notifications[0];

  return {
    headlineKey: 'brief.headline',
    bullets: [
      { id: 'market', labelKey: 'brief.marketChanges', count: marketCount || 3 },
      { id: 'competitor', labelKey: 'brief.competitorUpdates', count: competitorCount || 1 },
      { id: 'government', labelKey: 'brief.governmentItems', count: governmentCount || 2 },
    ],
    actionKey: action?.titleKey ?? 'brief.defaultAction',
    actionHref: action?.href ?? `/projects/${projectId}/market`,
  };
}
