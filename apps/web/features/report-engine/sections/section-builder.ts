import { randomUUID } from 'crypto';

import type { ReportBuildContext } from '../report-builder/report-build-context';
import type { ReportSectionContent, ReportSectionId } from '../types/report-types';

function block(
  type: ReportSectionContent['blocks'][0]['type'],
  opts: Partial<ReportSectionContent['blocks'][0]> & { id?: string },
): ReportSectionContent['blocks'][0] {
  return { id: opts.id ?? randomUUID(), type, ...opts };
}

function section(
  id: ReportSectionId,
  order: number,
  titleKey: string,
  storyStepKey: string,
  blocks: ReportSectionContent['blocks'],
): ReportSectionContent {
  return { id, order, titleKey, storyStepKey, blocks };
}

const BUILDERS: Record<ReportSectionId, (ctx: ReportBuildContext) => ReportSectionContent> = {
  EXECUTIVE_SUMMARY: (ctx) =>
    section('EXECUTIVE_SUMMARY', 0, 'sections.executiveSummary', 'story.step1', [
      block('heading', { bodyKey: 'sections.executiveSummary' }),
      ...ctx.workspace.summaryKeys.slice(0, 5).map((key, i) =>
        block('paragraph', {
          id: `summary-${i}`,
          bodyKey: key.startsWith('executive.') || key.startsWith('summary.') ? key : `executive.${key}`,
        }),
      ),
    ]),

  DECISION: (ctx) =>
    section('DECISION', 0, 'sections.decision', 'story.step2', [
      block('verdict', {
        labelKey: 'sections.verdictLabel',
        value: ctx.decision.verdict,
      }),
      block('metric', {
        labelKey: 'sections.decisionScore',
        value: ctx.decision.scores.decisionScore,
      }),
      block('metric', {
        labelKey: 'sections.confidence',
        value: ctx.decision.scores.confidence,
      }),
      ...ctx.decision.executiveSummaryKeys.slice(0, 2).map((key, i) =>
        block('paragraph', { id: `dec-${i}`, bodyKey: key }),
      ),
    ]),

  STRATEGIC_KPI: (ctx) =>
    section('STRATEGIC_KPI', 0, 'sections.strategicKpi', 'story.step3', [
      ...ctx.workspace.typeKpis.map((kpi) =>
        block('metric', {
          id: kpi.id,
          labelKey: kpi.labelKey,
          value: kpi.value,
          params: kpi.unitKey ? { unit: kpi.unitKey } : undefined,
        }),
      ),
      ...ctx.workspace.keyMetrics.map((m) =>
        block('metric', {
          id: m.id,
          labelKey: m.labelKey,
          value: m.value,
        }),
      ),
    ]),

  MARKET_INTELLIGENCE: (ctx) => {
    const market = ctx.decision.marketAnalysis?.result;
    if (!market) {
      return section('MARKET_INTELLIGENCE', 0, 'sections.marketIntel', 'story.step3', [
        block('paragraph', { bodyKey: 'sections.marketUnavailable' }),
      ]);
    }
    return section('MARKET_INTELLIGENCE', 0, 'sections.marketIntel', 'story.step3', [
      block('metric', { labelKey: 'sections.marketScore', value: market.marketScore }),
      block('metric', { labelKey: 'sections.tam', value: market.tam, params: { unit: 'M' } }),
      block('metric', { labelKey: 'sections.cagr', value: market.growthRate, params: { unit: '%' } }),
      ...market.opportunities.slice(0, 3).map((o, i) =>
        block('bullet', { id: `opp-${i}`, bodyKey: o.textKey }),
      ),
    ]);
  },

  FRAMEWORK_ANALYSIS: (ctx) => {
    const fw = ctx.decision.frameworkAnalysis;
    if (!fw || fw.frameworks.length === 0) {
      return section('FRAMEWORK_ANALYSIS', 0, 'sections.framework', 'story.step3', [
        block('paragraph', { bodyKey: 'sections.frameworkUnavailable' }),
      ]);
    }
    return section('FRAMEWORK_ANALYSIS', 0, 'sections.framework', 'story.step3', [
      ...fw.frameworks.map((f, i) =>
        block('bullet', { id: `fw-${i}`, labelKey: f.titleKey, value: f.confidence }),
      ),
      ...ctx.decision.explanation.drivers.slice(0, 4).map((d, i) =>
        block('table_row', {
          id: `drv-${i}`,
          labelKey: d.labelKey,
          value: d.impact,
          params: { direction: d.direction },
        }),
      ),
    ]);
  },

  STRATEGIC_RISKS: (ctx) =>
    section('STRATEGIC_RISKS', 0, 'sections.risks', 'story.step5', [
      ...ctx.workspace.risks.map((r, i) =>
        block('table_row', {
          id: r.id,
          labelKey: r.riskKey,
          bodyKey: r.mitigationKey,
          params: {
            severity: r.severity,
            probability: r.probability,
            impact: r.impact,
          },
        }),
      ),
    ]),

  STRATEGIC_OPPORTUNITIES: (ctx) =>
    section('STRATEGIC_OPPORTUNITIES', 0, 'sections.opportunities', 'story.step6', [
      ...ctx.workspace.opportunities.map((o, i) =>
        block('bullet', {
          id: o.id,
          labelKey: o.titleKey,
          bodyKey: o.descriptionKey,
        }),
      ),
    ]),

  RECOMMENDED_ACTIONS: (ctx) =>
    section('RECOMMENDED_ACTIONS', 0, 'sections.actions', 'story.step7', [
      ...ctx.workspace.actions.map((a, i) =>
        block('table_row', {
          id: a.id,
          labelKey: a.labelKey,
          bodyKey: a.descriptionKey,
          params: {
            priority: a.priority,
            owner: a.ownerKey,
            eta: a.etaDays,
          },
        }),
      ),
    ]),

  EXECUTION_STATUS: (ctx) => {
    const plan = ctx.orchestratorPlan;
    if (!plan) {
      return section('EXECUTION_STATUS', 0, 'sections.execution', 'story.step7', [
        block('paragraph', { bodyKey: 'sections.executionUnavailable' }),
      ]);
    }
    return section('EXECUTION_STATUS', 0, 'sections.execution', 'story.step7', [
      block('metric', { labelKey: 'sections.planStatus', value: plan.status }),
      ...plan.nodes.map((n) =>
        block('table_row', {
          id: n.id,
          labelKey: n.labelKey,
          params: { status: n.status },
        }),
      ),
    ]);
  },

  SUPPORTING_EVIDENCE: (ctx) =>
    section('SUPPORTING_EVIDENCE', 0, 'sections.evidence', 'story.step4', [
      ...ctx.workspace.evidence.map((e) =>
        block('table_row', {
          id: e.id,
          value: e.title,
          params: { confidence: e.confidence, source: e.sourceKey },
        }),
      ),
    ]),

  APPENDIX: (ctx) =>
    section('APPENDIX', 0, 'sections.appendix', 'story.step8', [
      block('paragraph', { bodyKey: 'sections.appendixIntro' }),
      block('bullet', {
        labelKey: 'sections.appendixGenerated',
        params: { date: ctx.decision.generatedAt },
      }),
      block('bullet', {
        labelKey: 'sections.appendixProvider',
        value: ctx.decision.providerId,
      }),
      ...(ctx.orchestratorPlan?.mergedEvidence.slice(0, 5).map((e, i) =>
        block('bullet', { id: `app-${i}`, labelKey: e.titleKey }),
      ) ?? []),
    ]),
};

export function buildSection(
  sectionId: ReportSectionId,
  ctx: ReportBuildContext,
  order: number,
): ReportSectionContent {
  const built = BUILDERS[sectionId](ctx);
  return { ...built, order };
}

export function buildAllSections(
  sectionIds: ReportSectionId[],
  ctx: ReportBuildContext,
): { sections: ReportSectionContent[]; appendix: ReportSectionContent[] } {
  const mainIds = sectionIds.filter((id) => id !== 'APPENDIX');
  const sections = mainIds.map((id, index) => buildSection(id, ctx, index + 1));
  const appendix = [buildSection('APPENDIX', ctx, 1)];
  return { sections, appendix };
}
