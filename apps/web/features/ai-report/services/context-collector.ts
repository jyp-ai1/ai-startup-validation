import { isSupabaseConfigured } from '@repo/db';
import type { ValidationReportContext } from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import { listResearchPlans } from '@/features/research/services/research-service';
import { listEvidence } from '@/features/evidence/services/evidence-service';
import { listCompetitors } from '@/features/competitors/services/competitor-service';
import { listVOCEntries } from '@/features/voc/services/voc-service';
import { listGrants } from '@/features/grants/services/grant-service';
import { findLatestValidationScore } from '@/features/validation/services/validation-service';

/** Collect all project validation data for AI report generation. */
export async function collectValidationContext(
  projectId: string,
): Promise<ValidationReportContext | null> {
  const project = await findStartupProject(projectId);
  if (!project) return null;

  const [
    researchPlans,
    evidence,
    competitors,
    voc,
    grants,
    validationScore,
  ] = await Promise.all([
    listResearchPlans(projectId),
    listEvidence(projectId),
    listCompetitors(projectId),
    listVOCEntries(projectId),
    listGrants(projectId),
    findLatestValidationScore(projectId),
  ]);

  return {
    project: {
      title: project.title,
      summary: project.summary,
      problem: project.problem,
      solution: project.solution,
      targetCustomer: project.targetCustomer,
      industry: project.industry,
      businessModel: project.businessModel,
      status: project.status,
    },
    researchPlans: researchPlans.map((plan) => ({
      title: plan.title,
      researchType: plan.researchType,
      status: plan.status,
      priority: plan.priority,
      description: plan.description,
    })),
    evidence: evidence.map((item) => ({
      title: item.title,
      category: item.category,
      summary: item.summary,
      confidence: item.confidence,
      sourceType: item.sourceType,
    })),
    competitors: competitors.map((item) => ({
      name: item.name,
      category: item.category,
      strengths: item.strengths,
      weaknesses: item.weaknesses,
      differentiation: item.differentiation,
      businessModel: item.businessModel,
    })),
    voc: voc.map((item) => ({
      title: item.title,
      painPoint: item.painPoint,
      severity: item.severity,
      frequency: item.frequency,
      willingnessToPay: item.willingnessToPay,
    })),
    grants: grants.map((item) => ({
      name: item.name,
      organization: item.organization,
      category: item.category,
      fitScore: item.fitScore,
      status: item.status,
    })),
    validationScore: validationScore
      ? {
          totalScore: validationScore.totalScore,
          decision: validationScore.decision,
          marketScore: validationScore.marketScore,
          problemScore: validationScore.problemScore,
          competitionScore: validationScore.competitionScore,
          businessModelScore: validationScore.businessModelScore,
          executionScore: validationScore.executionScore,
          founderFitScore: validationScore.founderFitScore,
          comment: validationScore.comment,
        }
      : null,
  };
}

export async function isContextCollectionAvailable(): Promise<boolean> {
  return isSupabaseConfigured();
}
