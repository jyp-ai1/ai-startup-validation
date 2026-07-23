import type { DecisionInput } from '@/features/decision/services/decision-types';

import { frameworkEngine } from './framework-engine';
import type { FrameworkAnalysisInput, FrameworkAnalysisResult } from './framework-types';

export function decisionInputToFrameworkInput(
  input: DecisionInput,
  industry: string | null,
  stage: FrameworkAnalysisInput['stage'],
): FrameworkAnalysisInput {
  return {
    projectId: input.projectId,
    projectTitle: input.projectTitle,
    projectType: input.projectType,
    industry,
    stage,
    locale: input.locale,
    research: input.research,
    evidence: input.evidence,
    voc: input.voc,
    competitors: input.competitors,
    grants: input.grants,
  };
}

export async function runFrameworkAnalysis(
  input: FrameworkAnalysisInput,
): Promise<FrameworkAnalysisResult> {
  return frameworkEngine.analyze(input);
}

export async function runFrameworkAnalysisForDecision(
  decisionInput: DecisionInput,
  industry: string | null,
  stage: FrameworkAnalysisInput['stage'],
): Promise<FrameworkAnalysisResult> {
  return runFrameworkAnalysis(decisionInputToFrameworkInput(decisionInput, industry, stage));
}
