import type {
  ConsultantAction,
  ConsultantFeedItem,
  ConsultantInput,
  ConsultantMemoryItem,
  ConsultantModuleStatus,
  ConsultantProjectContext,
  ConsultantPrompt,
  ConsultantQuestion,
  ConsultantRecommendation,
  ConsultantViewModel,
} from './consultant-types';

function modulePercent(value: number, target: number, scale = 100): number {
  if (target <= 0) return value > 0 ? 100 : 0;
  return Math.min(scale, Math.round((value / target) * scale));
}

function buildModules(input: ConsultantInput): ConsultantModuleStatus[] {
  const { stats, executive, strategy } = input;
  const checklist = strategy?.checklist ?? [];

  const researchItem = checklist.find((c) => c.id === 'RESEARCH');
  const vocItem = checklist.find((c) => c.id === 'VOC');
  const evidenceItem = checklist.find((c) => c.id === 'EVIDENCE');
  const competitorItem = checklist.find((c) => c.id === 'COMPETITOR');
  const decisionItem = checklist.find((c) => c.id === 'DECISION');

  const grantTotal = stats.grants.total;
  const governmentPercent = modulePercent(grantTotal, 3, 100);

  const decisionReady =
    Boolean(executive?.decision) &&
    (stats.voc.total >= 5 || stats.evidence.total >= 3) &&
    stats.research.total >= 1;

  const decisionPercent = decisionItem?.percent ?? (executive ? 60 : 0);

  return [
    {
      id: 'RESEARCH',
      labelKey: 'modules.research',
      percent: researchItem?.percent ?? modulePercent(stats.research.progressPercent, 100),
      status: (researchItem?.completed ? 'ready' : researchItem?.percent ? 'progress' : 'blocked') as ConsultantModuleStatus['status'],
      statusKey: researchItem?.completed ? 'modules.status.ready' : 'modules.status.progress',
    },
    {
      id: 'VOC',
      labelKey: 'modules.voc',
      percent: vocItem?.percent ?? modulePercent(stats.voc.total, 10),
      status: (stats.voc.total >= 10 ? 'ready' : stats.voc.total > 0 ? 'progress' : 'blocked') as ConsultantModuleStatus['status'],
      statusKey:
        stats.voc.total >= 10
          ? 'modules.status.ready'
          : stats.voc.total > 0
            ? 'modules.status.progress'
            : 'modules.status.blocked',
    },
    {
      id: 'EVIDENCE',
      labelKey: 'modules.evidence',
      percent: evidenceItem?.percent ?? modulePercent(stats.evidence.total, 5, 100),
      status: (stats.evidence.total >= 3 ? 'progress' : 'blocked') as ConsultantModuleStatus['status'],
      statusKey:
        stats.evidence.byConfidence.HIGH >= 1
          ? 'modules.status.ready'
          : stats.evidence.total > 0
            ? 'modules.status.progress'
            : 'modules.status.blocked',
    },
    {
      id: 'COMPETITOR',
      labelKey: 'modules.competitor',
      percent: competitorItem?.percent ?? modulePercent(stats.competitors.total, 3),
      status: (stats.competitors.total >= 2 ? 'progress' : 'blocked') as ConsultantModuleStatus['status'],
      statusKey:
        stats.competitors.total >= 3
          ? 'modules.status.ready'
          : stats.competitors.total > 0
            ? 'modules.status.progress'
            : 'modules.status.blocked',
    },
    {
      id: 'GOVERNMENT',
      labelKey: 'modules.government',
      percent: governmentPercent,
      status: (grantTotal >= 2 ? 'ready' : grantTotal > 0 ? 'progress' : 'blocked') as ConsultantModuleStatus['status'],
      statusKey:
        grantTotal >= 2
          ? 'modules.status.ready'
          : grantTotal > 0
            ? 'modules.status.progress'
            : 'modules.status.blocked',
    },
    {
      id: 'DECISION',
      labelKey: 'modules.decision',
      percent: decisionPercent,
      status: (decisionReady ? 'ready' : executive ? 'progress' : 'blocked') as ConsultantModuleStatus['status'],
      statusKey: decisionReady ? 'modules.status.ready' : 'modules.status.blocked',
    },
  ];
}

function buildRecommendations(input: ConsultantInput): ConsultantRecommendation[] {
  const actions = input.executive?.decision.recommendedActions ?? [];
  return actions.slice(0, 5).map((action, index) => ({
    ...action,
    rank: index + 1,
  }));
}

function buildTopRecommendation(
  input: ConsultantInput,
  recommendations: ConsultantRecommendation[],
): ConsultantViewModel['topRecommendation'] {
  const projectId = input.stats.project.id;

  if (recommendations[0]) {
    const top = recommendations[0];
    return {
      labelKey: top.labelKey,
      descriptionKey: top.descriptionKey,
      href: `/projects/${projectId}/agent`,
      manualHref: top.href,
    };
  }

  const next = input.strategy?.nextAction;
  if (next) {
    return {
      labelKey: next.labelKey,
      descriptionKey: next.descriptionKey,
      href: `/projects/${projectId}/agent`,
      manualHref: next.href,
    };
  }

  if (input.stats.voc.total < 10) {
    return {
      labelKey: 'recommendations.fallback.voc.label',
      descriptionKey: 'recommendations.fallback.voc.desc',
      href: `/projects/${projectId}/agent`,
      manualHref: `/projects/${projectId}/voc/new`,
    };
  }

  return null;
}

function buildContext(input: ConsultantInput): ConsultantProjectContext {
  const { stats, executive, strategy } = input;
  const project = stats.project;

  const decisionAvailable =
    Boolean(executive?.decision) &&
    stats.voc.total >= 5 &&
    stats.evidence.total >= 3;

  return {
    projectId: project.id,
    title: project.title,
    industry: project.industry,
    industryKey: project.industry ? 'context.industrySet' : 'context.industryUnknown',
    stageKey: `context.stages.${project.status.toLowerCase()}`,
    target: project.targetCustomer,
    targetKey: project.targetCustomer ? 'context.targetSet' : 'context.targetUnknown',
    score: executive?.decision.scores.decisionScore ?? strategy?.health.aiScore ?? 0,
    decisionLabelKey: decisionAvailable
      ? `context.decisions.${executive!.verdict.toLowerCase()}`
      : 'context.decisions.blocked',
    decisionAvailable,
    timelineStageKey: strategy?.currentStage
      ? `context.timeline.${strategy.currentStage.toLowerCase()}`
      : 'context.timeline.early',
  };
}

function buildQuestions(input: ConsultantInput): ConsultantQuestion[] {
  const project = input.stats.project;
  const projectId = project.id;
  const base = `/projects/${projectId}`;
  const questions: ConsultantQuestion[] = [];

  if (!project.targetCustomer) {
    questions.push({
      id: 'target-customer',
      questionKey: 'questions.targetCustomer',
      hintKey: 'questions.targetCustomerHint',
      href: `${base}`,
      fieldId: 'targetCustomer',
    });
  }
  if (!project.industry) {
    questions.push({
      id: 'market-size',
      questionKey: 'questions.marketSize',
      hintKey: 'questions.marketSizeHint',
      href: `${base}/research/new`,
      fieldId: 'industry',
    });
  }
  if (!project.businessModel) {
    questions.push({
      id: 'revenue-model',
      questionKey: 'questions.revenueModel',
      hintKey: 'questions.revenueModelHint',
      href: `${base}`,
      fieldId: 'businessModel',
    });
  }
  if (input.stats.grants.total === 0) {
    questions.push({
      id: 'grant-eligibility',
      questionKey: 'questions.grantEligibility',
      hintKey: 'questions.grantEligibilityHint',
      href: `${base}/grants`,
      fieldId: 'grants',
    });
  }
  if (input.stats.competitors.total === 0) {
    questions.push({
      id: 'competitors',
      questionKey: 'questions.competitors',
      href: `${base}/competitors/new`,
      fieldId: 'competitors',
    });
  }

  return questions.slice(0, 4);
}

function buildMemory(input: ConsultantInput): ConsultantMemoryItem[] {
  const projectId = input.stats.project.id;
  const items: ConsultantMemoryItem[] = [];

  for (const activity of input.stats.recentActivity.slice(0, 3)) {
    items.push({
      id: `mem-${activity.id}`,
      type: activity.type === 'REPORT' ? 'REPORT' : activity.type === 'VALIDATION' ? 'ANALYSIS' : 'EXECUTION',
      labelKey: `memory.activity.${activity.type.toLowerCase()}`,
      occurredAt: activity.occurredAt,
      href: `/projects/${projectId}`,
    });
  }

  if (input.orchestratorPlan?.status === 'COMPLETED') {
    items.unshift({
      id: 'mem-orchestrator',
      type: 'EXECUTION',
      labelKey: 'memory.orchestratorComplete',
      occurredAt: input.orchestratorPlan.completedAt ?? input.orchestratorPlan.startedAt,
      href: `/projects/${projectId}/agent`,
    });
  }

  if (input.hasExecutiveReport) {
    items.unshift({
      id: 'mem-report',
      type: 'REPORT',
      labelKey: 'memory.reportGenerated',
      occurredAt: input.stats.project.updatedAt,
      href: `/projects/${projectId}/executive-report`,
    });
  }

  if (input.executive?.decision) {
    items.unshift({
      id: 'mem-decision',
      type: 'ANALYSIS',
      labelKey: 'memory.decisionGenerated',
      occurredAt: input.executive.decision.generatedAt,
      href: `/projects/${projectId}/decision`,
    });
  }

  return items.slice(0, 5);
}

function buildFeed(input: ConsultantInput): ConsultantFeedItem[] {
  const feed: ConsultantFeedItem[] = [];
  const projectId = input.stats.project.id;

  if (input.orchestratorPlan) {
    for (const node of input.orchestratorPlan.nodes) {
      if (node.status === 'COMPLETED') {
        feed.push({
          id: `feed-agent-${node.id}`,
          type: 'AGENT',
          labelKey: 'feed.agentComplete',
          params: { agent: node.agentId },
          occurredAt: node.completedAt ?? input.orchestratorPlan.startedAt,
          status: 'completed',
        });
      } else if (node.status === 'RUNNING') {
        feed.push({
          id: `feed-agent-${node.id}`,
          type: 'AGENT',
          labelKey: 'feed.agentRunning',
          params: { agent: node.agentId },
          occurredAt: input.orchestratorPlan.completedAt ?? input.orchestratorPlan.startedAt,
          status: 'running',
        });
      }
    }
  }

  for (const activity of input.stats.recentActivity.slice(0, 6)) {
    const typeMap: Record<string, ConsultantFeedItem['type']> = {
      RESEARCH: 'RESEARCH',
      EVIDENCE: 'EVIDENCE',
      VOC: 'VOC',
      COMPETITOR: 'COMPETITOR',
      VALIDATION: 'DECISION',
      REPORT: 'REPORT',
    };
    feed.push({
      id: `feed-${activity.id}`,
      type: typeMap[activity.type] ?? 'RESEARCH',
      labelKey: `feed.${activity.type.toLowerCase()}`,
      occurredAt: activity.occurredAt,
      status: 'completed',
    });
  }

  if (input.hasExecutiveReport) {
    feed.unshift({
      id: 'feed-report',
      type: 'REPORT',
      labelKey: 'feed.reportGenerated',
      occurredAt: input.stats.project.updatedAt,
      status: 'completed',
    });
  }

  return feed
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 8);
}

function buildActions(input: ConsultantInput): ConsultantAction[] {
  const projectId = input.stats.project.id;
  const canDecide =
    input.stats.voc.total >= 5 &&
    input.stats.evidence.total >= 3 &&
    input.stats.research.total >= 1;

  return [
    {
      id: 'ai_research',
      labelKey: 'actions.aiResearch',
      href: `/projects/${projectId}/agent`,
      variant: 'default',
      enabled: true,
    },
    {
      id: 'generate_decision',
      labelKey: 'actions.generateDecision',
      href: `/projects/${projectId}/decision`,
      variant: 'outline',
      enabled: canDecide,
    },
    {
      id: 'generate_report',
      labelKey: 'actions.generateReport',
      href: `/projects/${projectId}/executive-report`,
      variant: 'outline',
      enabled: Boolean(input.executive?.decision),
    },
    {
      id: 'continue_research',
      labelKey: 'actions.continueResearch',
      href: `/projects/${projectId}/research`,
      variant: 'outline',
      enabled: input.stats.research.progressPercent < 100,
    },
  ];
}

function buildPrompts(projectId: string): ConsultantPrompt[] {
  return [
    {
      id: 'market_research',
      labelKey: 'prompts.marketResearch',
      href: `/projects/${projectId}/market-intelligence`,
    },
    {
      id: 'find_competitors',
      labelKey: 'prompts.findCompetitors',
      href: `/projects/${projectId}/competitors`,
    },
    {
      id: 'find_grants',
      labelKey: 'prompts.findGrants',
      href: `/projects/${projectId}/grants`,
    },
    {
      id: 'show_risks',
      labelKey: 'prompts.showRisks',
      href: `/projects/${projectId}/decision`,
    },
    {
      id: 'go_probability',
      labelKey: 'prompts.goProbability',
      href: `/projects/${projectId}/decision`,
    },
  ];
}

function computeGoProbability(input: ConsultantInput): { value: number; labelKey: string } {
  const executive = input.executive;
  if (executive?.decision) {
    const score = executive.decision.scores.decisionScore;
    const labelKey =
      executive.verdict === 'GO'
        ? 'goProbability.strong'
        : executive.verdict === 'HOLD'
          ? 'goProbability.moderate'
          : 'goProbability.weak';
    return { value: score, labelKey };
  }

  const progress = input.strategy?.overallProgress ?? 0;
  const vocBoost = Math.min(20, input.stats.voc.total * 2);
  const evidenceBoost = Math.min(15, input.stats.evidence.total * 3);
  const value = Math.min(85, Math.round(progress * 0.5 + vocBoost + evidenceBoost));

  return {
    value,
    labelKey: value >= 60 ? 'goProbability.moderate' : 'goProbability.early',
  };
}

function pickSummaryKey(input: ConsultantInput, modules: ConsultantModuleStatus[]): string {
  const voc = modules.find((m) => m.id === 'VOC');
  const decision = modules.find((m) => m.id === 'DECISION');

  if (input.stats.voc.total < 5) return 'summary.vocLow';
  if (input.stats.voc.total < 10) return 'summary.vocNeedsMore';
  if (input.stats.competitors.total < 2) return 'summary.competitorLow';
  if (input.stats.evidence.total < 3) return 'summary.evidenceLow';
  if (decision?.status === 'blocked') return 'summary.decisionBlocked';
  if (input.hasExecutiveReport) return 'summary.complete';
  if (voc?.percent && voc.percent >= 80) return 'summary.almostReady';
  return 'summary.analyzed';
}

/** AI Strategy Consultant — project-aware analysis, recommendations, and actions. */
export function buildConsultantViewModel(input: ConsultantInput): ConsultantViewModel {
  const projectId = input.stats.project.id;
  const modules = buildModules(input);
  const recommendations = buildRecommendations(input);
  const go = computeGoProbability(input);

  return {
    projectId,
    projectTitle: input.stats.project.title,
    summaryKey: pickSummaryKey(input, modules),
    summaryParams: {
      vocCount: input.stats.voc.total,
      competitorCount: input.stats.competitors.total,
      evidenceCount: input.stats.evidence.total,
    },
    goProbability: go.value,
    goProbabilityLabelKey: go.labelKey,
    modules,
    topRecommendation: buildTopRecommendation(input, recommendations),
    recommendations,
    context: buildContext(input),
    questions: buildQuestions(input),
    memory: buildMemory(input),
    actions: buildActions(input),
    prompts: buildPrompts(projectId),
    feed: buildFeed(input),
  };
}
