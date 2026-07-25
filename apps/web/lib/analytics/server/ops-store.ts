import { env } from '@repo/core/env';

import { PRODUCT_ANALYTICS_EVENTS } from '../product-analytics';
import type { AnalyticsEventPayload, OpsDashboardStats } from '../types';
import { ANALYTICS_EVENTS } from '../types';

const MAX_EVENTS = 5000;
const MAX_ERRORS = 50;

const events: AnalyticsEventPayload[] = [];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function countEvents(name: string, since?: Date): number {
  if (since) return countEventsSince(name, since);
  return events.filter((event) => event.name === name).length;
}

function countEventsSince(name: string, since: Date): number {
  return events.filter((event) => {
    if (event.name !== name) return false;
    return new Date(event.timestamp) >= since;
  }).length;
}

function countGoDecisionsToday(since: Date): number {
  return events.filter((event) => {
    if (event.name !== PRODUCT_ANALYTICS_EVENTS.decisionGenerated) return false;
    if (new Date(event.timestamp) < since) return false;
    const verdict = event.params?.verdict;
    return typeof verdict === 'string' && verdict.toUpperCase().includes('GO');
  }).length;
}

function countPageViews(since: Date): number {
  return events.filter(
    (event) =>
      (event.name === ANALYTICS_EVENTS.pageView || event.name === ANALYTICS_EVENTS.dashboardView) &&
      new Date(event.timestamp) >= since,
  ).length;
}

function breakdown(key: 'language' | 'theme'): Record<string, number> {
  return events.reduce<Record<string, number>>((acc, event) => {
    const value = event.params?.[key];
    if (typeof value === 'string' && value.length > 0) {
      acc[value] = (acc[value] ?? 0) + 1;
    }
    return acc;
  }, {});
}

function topScreens(limit = 8): { screen: string; count: number }[] {
  const counts = events.reduce<Record<string, number>>((acc, event) => {
    const screen = event.params?.screen;
    if (typeof screen === 'string' && screen.length > 0) {
      acc[screen] = (acc[screen] ?? 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([screen, count]) => ({ screen, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function recentErrors() {
  return events
    .filter((event) => event.name === ANALYTICS_EVENTS.error)
    .slice(-MAX_ERRORS)
    .reverse()
    .map((event) => ({
      message: String(event.params?.error_message ?? 'Unknown error'),
      screen: typeof event.params?.screen === 'string' ? event.params.screen : undefined,
      timestamp: event.timestamp,
    }));
}

function latestWebVitals() {
  const vitals = { lcp: undefined as number | undefined, cls: undefined as number | undefined, inp: undefined as number | undefined };
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.name !== ANALYTICS_EVENTS.webVital) continue;
    const metric = event.params?.metric_name;
    const value = event.params?.metric_value;
    if (typeof metric !== 'string' || typeof value !== 'number') continue;
    if (metric === 'LCP' && vitals.lcp === undefined) vitals.lcp = value;
    if (metric === 'CLS' && vitals.cls === undefined) vitals.cls = value;
    if (metric === 'INP' && vitals.inp === undefined) vitals.inp = value;
    if (vitals.lcp !== undefined && vitals.cls !== undefined && vitals.inp !== undefined) break;
  }
  return vitals;
}

const FUNNEL_STEPS: { key: keyof NonNullable<OpsDashboardStats['productJourneyFunnel']>; label: string }[] = [
  { key: 'landing', label: 'landing → goal' },
  { key: 'goal', label: 'goal → workflow' },
  { key: 'workflow', label: 'workflow → workspace' },
  { key: 'workspace', label: 'workspace → project' },
  { key: 'project', label: 'project → analysis' },
  { key: 'analysis', label: 'analysis → decision' },
];

function computeDropOffRates(
  funnel: NonNullable<OpsDashboardStats['productJourneyFunnel']>,
): NonNullable<OpsDashboardStats['dropOffRates']> {
  const values = FUNNEL_STEPS.map((s) => funnel[s.key]);
  return FUNNEL_STEPS.slice(0, -1).map((step, index) => {
    const from = values[index] ?? 0;
    const to = values[index + 1] ?? 0;
    const dropPercent = from > 0 ? Math.round((1 - to / from) * 100) : 0;
    return { step: step.label, from, to, dropPercent };
  });
}

function recentFeedback(limit = 20) {
  return events
    .filter((event) => event.name === PRODUCT_ANALYTICS_EVENTS.feedbackSubmitted)
    .slice(-limit)
    .reverse()
    .map((event) => ({
      sentiment: (event.params?.sentiment === 'down' ? 'down' : 'up') as 'up' | 'down',
      message:
        typeof event.params?.message === 'string' && event.params.message.length > 0
          ? event.params.message
          : undefined,
      screen: typeof event.params?.screen === 'string' ? event.params.screen : undefined,
      timestamp: event.timestamp,
    }));
}

function analyticsProviders() {
  return {
    ga: Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    posthog: Boolean(env.NEXT_PUBLIC_POSTHOG_KEY),
    clarity: Boolean(env.NEXT_PUBLIC_CLARITY_PROJECT_ID),
  };
}

const MOCK_STATS: OpsDashboardStats = {
  source: 'mock',
  todayVisitors: 24,
  weekVisitors: 156,
  projectCreates: 8,
  aiGenerations: 12,
  reportGenerations: 5,
  languageBreakdown: { ko: 68, en: 32 },
  themeBreakdown: { light: 45, dark: 40, system: 15 },
  topScreens: [
    { screen: '/dashboard', count: 42 },
    { screen: '/projects', count: 28 },
    { screen: '/projects/*/validation', count: 19 },
    { screen: '/projects/*/voc', count: 15 },
  ],
  recentErrors: [],
  webVitals: { lcp: 2100, cls: 0.04, inp: 180 },
  gaConnected: Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
  totalEvents: 0,
  activationFunnel: {
    landing: 0,
    signup: 0,
    wizardComplete: 0,
    researchExecute: 0,
    decisionGenerate: 0,
    reportGenerate: 0,
  },
  productJourneyFunnel: {
    landing: 100,
    goal: 72,
    workflow: 58,
    workspace: 43,
    project: 17,
    analysis: 15,
    decision: 9,
  },
  todaySummary: {
    goalSelected: 12,
    workspaceEntered: 8,
    goDecisions: 3,
    feedbackSubmitted: 5,
  },
  dropOffRates: [
    { step: 'landing → goal', from: 100, to: 72, dropPercent: 28 },
    { step: 'goal → workflow', from: 72, to: 58, dropPercent: 19 },
    { step: 'workflow → workspace', from: 58, to: 43, dropPercent: 26 },
    { step: 'workspace → project', from: 43, to: 17, dropPercent: 60 },
  ],
  recentFeedback: [],
  analyticsProviders: {
    ga: Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    posthog: Boolean(env.NEXT_PUBLIC_POSTHOG_KEY),
    clarity: Boolean(env.NEXT_PUBLIC_CLARITY_PROJECT_ID),
  },
};

export function recordAnalyticsEvent(payload: AnalyticsEventPayload): void {
  events.push(payload);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

export function getOpsDashboardStats(): OpsDashboardStats {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);

  if (events.length === 0) {
    return {
      ...MOCK_STATS,
      gaConnected: Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
      analyticsProviders: analyticsProviders(),
    };
  }

  const aiGenerations =
    countEvents(ANALYTICS_EVENTS.decisionGenerate) +
    countEvents(ANALYTICS_EVENTS.strategyGenerate) +
    countEvents(ANALYTICS_EVENTS.businessPlanGenerate) +
    countEvents(ANALYTICS_EVENTS.reportGenerate);

  return {
    source: 'live',
    todayVisitors: countPageViews(todayStart),
    weekVisitors: countPageViews(weekStart),
    projectCreates: countEvents(ANALYTICS_EVENTS.projectCreate),
    aiGenerations,
    reportGenerations: countEvents(ANALYTICS_EVENTS.reportGenerate),
    languageBreakdown: breakdown('language'),
    themeBreakdown: breakdown('theme'),
    topScreens: topScreens(),
    recentErrors: recentErrors(),
    webVitals: latestWebVitals(),
    gaConnected: Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    totalEvents: events.length,
    activationFunnel: {
      landing: countEvents(ANALYTICS_EVENTS.landingView) + countEvents(ANALYTICS_EVENTS.landingStartClick),
      signup: countEvents(ANALYTICS_EVENTS.signup) + countEvents(ANALYTICS_EVENTS.login),
      wizardComplete: countEvents(ANALYTICS_EVENTS.wizardComplete),
      researchExecute: countEvents(ANALYTICS_EVENTS.researchExecute),
      decisionGenerate: countEvents(ANALYTICS_EVENTS.decisionGenerate),
      reportGenerate: countEvents(ANALYTICS_EVENTS.reportGenerate),
    },
    productJourneyFunnel: {
      landing: countEvents(PRODUCT_ANALYTICS_EVENTS.landingViewed),
      goal: countEvents(PRODUCT_ANALYTICS_EVENTS.goalSelected),
      workflow: countEvents(PRODUCT_ANALYTICS_EVENTS.workflowStarted),
      workspace: countEvents(PRODUCT_ANALYTICS_EVENTS.workspaceEntered),
      project: countEvents(PRODUCT_ANALYTICS_EVENTS.projectCreated),
      analysis: countEvents(PRODUCT_ANALYTICS_EVENTS.analysisStarted),
      decision: countEvents(PRODUCT_ANALYTICS_EVENTS.decisionGenerated),
    },
    todaySummary: {
      goalSelected: countEventsSince(PRODUCT_ANALYTICS_EVENTS.goalSelected, todayStart),
      workspaceEntered: countEventsSince(PRODUCT_ANALYTICS_EVENTS.workspaceEntered, todayStart),
      goDecisions: countGoDecisionsToday(todayStart),
      feedbackSubmitted: countEventsSince(PRODUCT_ANALYTICS_EVENTS.feedbackSubmitted, todayStart),
    },
    dropOffRates: computeDropOffRates({
      landing: countEvents(PRODUCT_ANALYTICS_EVENTS.landingViewed),
      goal: countEvents(PRODUCT_ANALYTICS_EVENTS.goalSelected),
      workflow: countEvents(PRODUCT_ANALYTICS_EVENTS.workflowStarted),
      workspace: countEvents(PRODUCT_ANALYTICS_EVENTS.workspaceEntered),
      project: countEvents(PRODUCT_ANALYTICS_EVENTS.projectCreated),
      analysis: countEvents(PRODUCT_ANALYTICS_EVENTS.analysisStarted),
      decision: countEvents(PRODUCT_ANALYTICS_EVENTS.decisionGenerated),
    }),
    recentFeedback: recentFeedback(),
    analyticsProviders: analyticsProviders(),
  };
}
