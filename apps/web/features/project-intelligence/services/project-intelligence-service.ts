import type { ExecutionPlan } from '@/features/agents/orchestrator';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';
import type { OnboardingContext } from '@/features/onboarding-consultant/types';
import type { StartupProject } from '@repo/types/validation';

import type { ProjectIntelligence } from '../types';

type IntelligenceInput = {
  project: StartupProject;
  stats: ProjectDashboardStats;
  executive: ExecutiveWorkspaceViewModel | null;
  onboardingContext?: OnboardingContext | null;
  hasExecutiveReport: boolean;
  orchestratorPlan: ExecutionPlan | null;
};

function pickRisk(input: IntelligenceInput): string | null {
  const { stats, executive } = input;
  if (stats.voc.total < 5) return 'insufficient_voc';
  if (stats.evidence.total < 3) return 'thin_evidence';
  if (stats.competitors.total < 2) return 'competitor_gap';
  if (executive?.verdict === 'NO_GO') return 'decision_no_go';
  if (executive?.verdict === 'HOLD') return 'decision_hold';
  return null;
}

function pickOpportunity(input: IntelligenceInput): string | null {
  const { stats, executive, hasExecutiveReport } = input;
  if (hasExecutiveReport) return 'report_ready';
  if (executive?.verdict === 'GO') return 'decision_go';
  if (stats.grants.total >= 2) return 'grant_programs';
  if (stats.research.progressPercent >= 50) return 'research_momentum';
  if (input.onboardingContext?.answers.concern === 'MARKET') return 'market_expansion';
  return 'validation_progress';
}

function computeScore(input: IntelligenceInput): number {
  const { stats, executive, hasExecutiveReport } = input;
  const research = Math.min(20, stats.research.progressPercent * 0.2);
  const voc = Math.min(25, stats.voc.total * 2.5);
  const evidence = Math.min(20, stats.evidence.total * 4);
  const competitor = Math.min(10, stats.competitors.total * 3);
  const decision = executive?.decision ? 15 : 0;
  const report = hasExecutiveReport ? 10 : 0;
  return Math.min(100, Math.round(research + voc + evidence + competitor + decision + report));
}

function buildProjectSummary(input: IntelligenceInput): string {
  const { project, onboardingContext, stats } = input;
  const parts: string[] = [];

  if (onboardingContext?.summary) {
    parts.push(onboardingContext.summary);
  } else if (project.summary) {
    parts.push(project.summary);
  }

  parts.push(
    `Progress: Research ${stats.research.progressPercent}%, VOC ${stats.voc.total}, Evidence ${stats.evidence.total}, Competitors ${stats.competitors.total}.`,
  );

  return parts.join(' ');
}

export function buildProjectIntelligence(input: IntelligenceInput): ProjectIntelligence {
  const { project, onboardingContext } = input;

  return {
    projectId: project.id,
    projectSummary: buildProjectSummary(input),
    businessGoal:
      onboardingContext?.answers.finalGoal ?? project.projectGoal ?? project.summary ?? null,
    targetCustomer:
      onboardingContext?.answers.targetCustomer ?? project.targetCustomer ?? null,
    businessModel: project.businessModel ?? null,
    industry: project.industry ?? null,
    stage: project.status,
    risk: pickRisk(input),
    opportunity: pickOpportunity(input),
    currentScore: computeScore(input),
    updatedAt: new Date().toISOString(),
  };
}
