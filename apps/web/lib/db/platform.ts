/**
 * Database platform entry point for apps/web.
 */
import {
  DbTokens,
  getDatabasePlatform,
  type CompetitorRepository,
  type EvidenceRepository,
  type GovernmentGrantRepository,
  type ResearchPlanRepository,
  type StartupProjectRepository,
  type UserRepository,
  type ValidationScoreRepository,
  type ValidationReportRepository,
  type ReportSectionRepository,
  type AIReportGenerationRepository,
  type BusinessPlanRepository,
  type BusinessPlanSectionRepository,
  type PRDRepository,
  type PRDSectionRepository,
  type DevelopmentSpecRepository,
  type DevelopmentSpecSectionRepository,
  type KnowledgeDocumentRepository,
  type KnowledgeChunkRepository,
  type VOCRepository,
} from '@repo/db';

export const db = getDatabasePlatform();

export function getUserRepository(): UserRepository {
  return db.resolve<UserRepository>(DbTokens.UserRepository);
}

export function getStartupProjectRepository(): StartupProjectRepository {
  return db.resolve<StartupProjectRepository>(DbTokens.StartupProjectRepository);
}

export function getResearchPlanRepository(): ResearchPlanRepository {
  return db.resolve<ResearchPlanRepository>(DbTokens.ResearchPlanRepository);
}

export function getEvidenceRepository(): EvidenceRepository {
  return db.resolve<EvidenceRepository>(DbTokens.EvidenceRepository);
}

export function getCompetitorRepository(): CompetitorRepository {
  return db.resolve<CompetitorRepository>(DbTokens.CompetitorRepository);
}

export function getVOCRepository(): VOCRepository {
  return db.resolve<VOCRepository>(DbTokens.VOCRepository);
}

export function getGovernmentGrantRepository(): GovernmentGrantRepository {
  return db.resolve<GovernmentGrantRepository>(DbTokens.GovernmentGrantRepository);
}

export function getValidationScoreRepository(): ValidationScoreRepository {
  return db.resolve<ValidationScoreRepository>(DbTokens.ValidationScoreRepository);
}

export function getValidationReportRepository(): ValidationReportRepository {
  return db.resolve<ValidationReportRepository>(DbTokens.ValidationReportRepository);
}

export function getReportSectionRepository(): ReportSectionRepository {
  return db.resolve<ReportSectionRepository>(DbTokens.ReportSectionRepository);
}

export function getAIReportGenerationRepository(): AIReportGenerationRepository {
  return db.resolve<AIReportGenerationRepository>(DbTokens.AIReportGenerationRepository);
}

export function getBusinessPlanRepository(): BusinessPlanRepository {
  return db.resolve<BusinessPlanRepository>(DbTokens.BusinessPlanRepository);
}

export function getBusinessPlanSectionRepository(): BusinessPlanSectionRepository {
  return db.resolve<BusinessPlanSectionRepository>(DbTokens.BusinessPlanSectionRepository);
}

export function getPRDRepository(): PRDRepository {
  return db.resolve<PRDRepository>(DbTokens.PRDRepository);
}

export function getPRDSectionRepository(): PRDSectionRepository {
  return db.resolve<PRDSectionRepository>(DbTokens.PRDSectionRepository);
}

export function getDevelopmentSpecRepository(): DevelopmentSpecRepository {
  return db.resolve<DevelopmentSpecRepository>(DbTokens.DevelopmentSpecRepository);
}

export function getDevelopmentSpecSectionRepository(): DevelopmentSpecSectionRepository {
  return db.resolve<DevelopmentSpecSectionRepository>(DbTokens.DevelopmentSpecSectionRepository);
}

export function getKnowledgeDocumentRepository(): KnowledgeDocumentRepository {
  return db.resolve<KnowledgeDocumentRepository>(DbTokens.KnowledgeDocumentRepository);
}

export function getKnowledgeChunkRepository(): KnowledgeChunkRepository {
  return db.resolve<KnowledgeChunkRepository>(DbTokens.KnowledgeChunkRepository);
}

export { DbTokens, getDatabasePlatform };
export type {
  UserRepository,
  OrganizationRepository,
  ProjectRepository,
  StartupProjectRepository,
  ResearchPlanRepository,
  EvidenceRepository,
  CompetitorRepository,
  VOCRepository,
  GovernmentGrantRepository,
  ValidationScoreRepository,
  ValidationReportRepository,
  ReportSectionRepository,
  AIReportGenerationRepository,
  BusinessPlanRepository,
  BusinessPlanSectionRepository,
  PRDRepository,
  PRDSectionRepository,
  DevelopmentSpecRepository,
  DevelopmentSpecSectionRepository,
  KnowledgeDocumentRepository,
  KnowledgeChunkRepository,
} from '@repo/db';
