import type { StartupProject } from '@repo/types/validation';

import type { DemoWorkflowSnapshot } from '@/features/workflow-journey/lib/v2-demo-project-store';

export type WorkspaceRestoreCheck = {
  id: string;
  label: string;
  pass: boolean;
};

export type WorkspaceRestoreState = {
  checks: WorkspaceRestoreCheck[];
  allPass: boolean;
  lastWorkLabel: string;
  lastWorkStage: string;
};

function readV2Demo(project: StartupProject): Record<string, unknown> | null {
  const ctx = project.onboardingContext;
  if (!ctx || typeof ctx !== 'object') return null;
  const v2Demo = (ctx as Record<string, unknown>).v2Demo;
  return v2Demo && typeof v2Demo === 'object' ? (v2Demo as Record<string, unknown>) : null;
}

function readWorkflow(project: StartupProject): DemoWorkflowSnapshot | null {
  const v2Demo = readV2Demo(project);
  if (!v2Demo?.workflow || typeof v2Demo.workflow !== 'object') return null;
  return v2Demo.workflow as DemoWorkflowSnapshot;
}

/** Derive last-work label for restore banner (Sprint 5 P0-7). */
export function deriveWorkspaceRestoreState(project: StartupProject): WorkspaceRestoreState {
  const workflow = readWorkflow(project);
  const v2Demo = readV2Demo(project);
  const smartAnswers = workflow?.smartAnswers ?? {};

  const hasPricing =
    Boolean(smartAnswers.pricingModel) ||
    Boolean(v2Demo?.pricingModel) ||
    Boolean(workflow?.reasonChainSummary?.includes('pricing'));

  const lastWorkStage = hasPricing ? 'pricing_strategy' : 'investigation_review';
  const lastWorkLabel = hasPricing
    ? '가격 전략 · Artifact 생성 전'
    : '조사 검토 · Artifact 생성 전';

  const checks: WorkspaceRestoreCheck[] = [
    {
      id: 'project_title',
      label: '프로젝트 저장됨',
      pass: project.title.trim().length >= 2,
    },
    {
      id: 'onboarding_context',
      label: '온보딩/데모 데이터',
      pass: Boolean(project.onboardingContext),
    },
    {
      id: 'last_work_pricing',
      label: '마지막 작업 (가격 전략)',
      pass: hasPricing || Boolean(project.summary),
    },
    {
      id: 'before_artifact',
      label: 'Artifact 생성 전 단계',
      pass: workflow?.lastDemoStep !== 'artifact' || !workflow?.artifactDraft,
    },
    {
      id: 'session_project_match',
      label: '프로젝트 ID 일치',
      pass: Boolean(project.id),
    },
  ];

  return {
    checks,
    allPass: checks.every((check) => check.pass),
    lastWorkLabel,
    lastWorkStage,
  };
}
