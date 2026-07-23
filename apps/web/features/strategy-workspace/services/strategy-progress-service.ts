import type {
  NextBestAction,
  StrategyChecklistItem,
  StrategyStageId,
  StrategyWorkspaceInput,
  StrategyWorkspaceViewModel,
  WorkspaceTimelineEntry,
} from './strategy-workspace-types';

const STAGE_ORDER: StrategyStageId[] = [
  'RESEARCH',
  'EVIDENCE',
  'VOC',
  'COMPETITOR',
  'MARKET',
  'FRAMEWORK',
  'DECISION',
  'REPORT',
];

const STAGE_META: Record<
  StrategyStageId,
  { labelKey: string; hrefSegment: string; estimate: number; threshold: (input: StrategyWorkspaceInput) => { done: boolean; percent: number } }
> = {
  RESEARCH: {
    labelKey: 'checklist.research',
    hrefSegment: 'research',
    estimate: 15,
    threshold: ({ stats }) => {
      const { total, progressPercent } = stats.research;
      if (total === 0) return { done: false, percent: 0 };
      if (progressPercent >= 100) return { done: true, percent: 100 };
      return { done: progressPercent >= 50, percent: Math.max(progressPercent, total > 0 ? 30 : 0) };
    },
  },
  EVIDENCE: {
    labelKey: 'checklist.evidence',
    hrefSegment: 'evidence',
    estimate: 10,
    threshold: ({ stats }) => {
      const total = stats.evidence.total;
      const high = stats.evidence.byConfidence.HIGH;
      const percent = Math.min(100, total * 15 + high * 5);
      return { done: total >= 3 && high >= 1, percent };
    },
  },
  VOC: {
    labelKey: 'checklist.voc',
    hrefSegment: 'voc',
    estimate: 8,
    threshold: ({ stats }) => {
      const total = stats.voc.total;
      const percent = Math.min(100, total * 10);
      return { done: total >= 5, percent };
    },
  },
  COMPETITOR: {
    labelKey: 'checklist.competitor',
    hrefSegment: 'competitors',
    estimate: 12,
    threshold: ({ stats }) => {
      const total = stats.competitors.total;
      const percent = Math.min(100, total * 25);
      return { done: total >= 2, percent };
    },
  },
  MARKET: {
    labelKey: 'checklist.market',
    hrefSegment: 'market-intelligence',
    estimate: 5,
    threshold: ({ executive }) => {
      const has = Boolean(executive?.decision.marketAnalysis);
      return { done: has, percent: has ? 100 : executive ? 40 : 0 };
    },
  },
  FRAMEWORK: {
    labelKey: 'checklist.framework',
    hrefSegment: 'decision',
    estimate: 10,
    threshold: ({ executive }) => {
      const fw = executive?.decision.frameworkAnalysis;
      const has = Boolean(fw && fw.frameworks.length > 0);
      return { done: has, percent: has ? 100 : executive ? 35 : 0 };
    },
  },
  DECISION: {
    labelKey: 'checklist.decision',
    hrefSegment: 'decision',
    estimate: 5,
    threshold: ({ stats, executive }) => {
      const hasValidation =
        stats.validationScore !== null && stats.validationScore.decision !== 'DRAFT';
      const hasDecision = Boolean(executive?.decision);
      const done = hasValidation || hasDecision;
      return { done, percent: done ? 100 : executive ? 60 : 0 };
    },
  },
  REPORT: {
    labelKey: 'checklist.report',
    hrefSegment: 'executive-report',
    estimate: 8,
    threshold: ({ hasExecutiveReport }) => {
      return { done: hasExecutiveReport, percent: hasExecutiveReport ? 100 : 0 };
    },
  },
};

const NEXT_ACTION_COPY: Record<
  StrategyStageId,
  { labelKey: string; descriptionKey: string; ctaKey: string }
> = {
  RESEARCH: {
    labelKey: 'nextAction.research.label',
    descriptionKey: 'nextAction.research.desc',
    ctaKey: 'nextAction.research.cta',
  },
  EVIDENCE: {
    labelKey: 'nextAction.evidence.label',
    descriptionKey: 'nextAction.evidence.desc',
    ctaKey: 'nextAction.evidence.cta',
  },
  VOC: {
    labelKey: 'nextAction.voc.label',
    descriptionKey: 'nextAction.voc.desc',
    ctaKey: 'nextAction.voc.cta',
  },
  COMPETITOR: {
    labelKey: 'nextAction.competitor.label',
    descriptionKey: 'nextAction.competitor.desc',
    ctaKey: 'nextAction.competitor.cta',
  },
  MARKET: {
    labelKey: 'nextAction.market.label',
    descriptionKey: 'nextAction.market.desc',
    ctaKey: 'nextAction.market.cta',
  },
  FRAMEWORK: {
    labelKey: 'nextAction.framework.label',
    descriptionKey: 'nextAction.framework.desc',
    ctaKey: 'nextAction.framework.cta',
  },
  DECISION: {
    labelKey: 'nextAction.decision.label',
    descriptionKey: 'nextAction.decision.desc',
    ctaKey: 'nextAction.decision.cta',
  },
  REPORT: {
    labelKey: 'nextAction.report.label',
    descriptionKey: 'nextAction.report.desc',
    ctaKey: 'nextAction.report.cta',
  },
};

function buildChecklist(input: StrategyWorkspaceInput): StrategyChecklistItem[] {
  const projectId = input.stats.project.id;
  return STAGE_ORDER.map((id) => {
    const meta = STAGE_META[id];
    const { done, percent } = meta.threshold(input);
    return {
      id,
      labelKey: meta.labelKey,
      href: `/projects/${projectId}/${meta.hrefSegment}`,
      completed: done,
      percent: done ? 100 : Math.round(percent),
      estimatedMinutes: meta.estimate,
    };
  });
}

function pickCurrentStage(checklist: StrategyChecklistItem[]): StrategyStageId {
  const firstOpen = checklist.find((item) => !item.completed);
  return firstOpen?.id ?? 'REPORT';
}

function buildNextAction(
  checklist: StrategyChecklistItem[],
  projectId: string,
): NextBestAction {
  const target = checklist.find((item) => !item.completed) ?? checklist[checklist.length - 1]!;
  const copy = NEXT_ACTION_COPY[target.id];
  const meta = STAGE_META[target.id];

  return {
    id: `next-${target.id}`,
    labelKey: copy.labelKey,
    descriptionKey: copy.descriptionKey,
    ctaKey: copy.ctaKey,
    href: `/projects/${projectId}/${meta.hrefSegment}`,
    estimatedMinutes: meta.estimate,
    stageId: target.id,
  };
}

function buildTimeline(checklist: StrategyChecklistItem[]): WorkspaceTimelineEntry[] {
  const currentIdx = checklist.findIndex((item) => !item.completed);

  return checklist.map((item, index) => {
    let status: WorkspaceTimelineEntry['status'] = 'upcoming';
    if (item.completed) status = 'completed';
    else if (index === currentIdx) status = 'current';

    return {
      id: item.id,
      labelKey: item.labelKey,
      status,
      href: item.href,
    };
  });
}

/** Guided Strategy Workspace — progress, checklist, next action, health. */
export function buildStrategyWorkspace(input: StrategyWorkspaceInput): StrategyWorkspaceViewModel {
  const checklist = buildChecklist(input);
  const completedCount = checklist.filter((item) => item.completed).length;
  const overallProgress = Math.round((completedCount / checklist.length) * 100);
  const remaining = checklist.filter((item) => !item.completed);
  const currentStage = pickCurrentStage(checklist);
  const estimatedMinutesRemaining = remaining.reduce((sum, item) => sum + item.estimatedMinutes, 0);

  const executive = input.executive;
  const riskScore =
    executive?.decision.verdict === 'NO_GO'
      ? 82
      : executive?.decision.verdict === 'HOLD'
        ? 55
        : 28;

  return {
    projectId: input.stats.project.id,
    overallProgress,
    currentStage,
    currentStageLabelKey: STAGE_META[currentStage].labelKey,
    estimatedMinutesRemaining,
    remainingTaskCount: remaining.length,
    checklist,
    nextAction: buildNextAction(checklist, input.stats.project.id),
    timeline: buildTimeline(checklist),
    moduleProgress: checklist,
    health: {
      aiScore: executive?.decision.scores.decisionScore ?? Math.round(overallProgress * 0.8),
      progress: overallProgress,
      risk: riskScore,
      confidence: executive?.decision.scores.confidence ?? Math.round(overallProgress * 0.7),
    },
    greetingKey: overallProgress === 0 ? 'progress.greetingStart' : 'progress.greetingContinue',
    introKey: overallProgress >= 100 ? 'progress.introComplete' : 'progress.introActive',
    isComplete: overallProgress >= 100,
  };
}

export { STAGE_ORDER, STAGE_META };
