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
  type ProjectMemoryRepository,
  type UserWatchlistRepository,
  type NotificationRepository,
  type NotificationSettingsRepository,
  type VOCRepository,
} from '@repo/db';

let dbInstance: ReturnType<typeof getDatabasePlatform> | null = null;

function getDb(): ReturnType<typeof getDatabasePlatform> {
  if (!dbInstance) {
    dbInstance = getDatabasePlatform();
  }
  return dbInstance;
}

export function getUserRepository(): UserRepository {
  return getDb().resolve<UserRepository>(DbTokens.UserRepository);
}

export function getStartupProjectRepository(): StartupProjectRepository {
  return getDb().resolve<StartupProjectRepository>(DbTokens.StartupProjectRepository);
}

export function getResearchPlanRepository(): ResearchPlanRepository {
  return getDb().resolve<ResearchPlanRepository>(DbTokens.ResearchPlanRepository);
}

export function getEvidenceRepository(): EvidenceRepository {
  return getDb().resolve<EvidenceRepository>(DbTokens.EvidenceRepository);
}

export function getCompetitorRepository(): CompetitorRepository {
  return getDb().resolve<CompetitorRepository>(DbTokens.CompetitorRepository);
}

export function getVOCRepository(): VOCRepository {
  return getDb().resolve<VOCRepository>(DbTokens.VOCRepository);
}

export function getGovernmentGrantRepository(): GovernmentGrantRepository {
  return getDb().resolve<GovernmentGrantRepository>(DbTokens.GovernmentGrantRepository);
}

export function getValidationScoreRepository(): ValidationScoreRepository {
  return getDb().resolve<ValidationScoreRepository>(DbTokens.ValidationScoreRepository);
}

export function getValidationReportRepository(): ValidationReportRepository {
  return getDb().resolve<ValidationReportRepository>(DbTokens.ValidationReportRepository);
}

export function getReportSectionRepository(): ReportSectionRepository {
  return getDb().resolve<ReportSectionRepository>(DbTokens.ReportSectionRepository);
}

export function getAIReportGenerationRepository(): AIReportGenerationRepository {
  return getDb().resolve<AIReportGenerationRepository>(DbTokens.AIReportGenerationRepository);
}

export function getBusinessPlanRepository(): BusinessPlanRepository {
  return getDb().resolve<BusinessPlanRepository>(DbTokens.BusinessPlanRepository);
}

export function getBusinessPlanSectionRepository(): BusinessPlanSectionRepository {
  return getDb().resolve<BusinessPlanSectionRepository>(DbTokens.BusinessPlanSectionRepository);
}

export function getPRDRepository(): PRDRepository {
  return getDb().resolve<PRDRepository>(DbTokens.PRDRepository);
}

export function getPRDSectionRepository(): PRDSectionRepository {
  return getDb().resolve<PRDSectionRepository>(DbTokens.PRDSectionRepository);
}

export function getDevelopmentSpecRepository(): DevelopmentSpecRepository {
  return getDb().resolve<DevelopmentSpecRepository>(DbTokens.DevelopmentSpecRepository);
}

export function getDevelopmentSpecSectionRepository(): DevelopmentSpecSectionRepository {
  return getDb().resolve<DevelopmentSpecSectionRepository>(DbTokens.DevelopmentSpecSectionRepository);
}

export function getKnowledgeDocumentRepository(): KnowledgeDocumentRepository {
  return getDb().resolve<KnowledgeDocumentRepository>(DbTokens.KnowledgeDocumentRepository);
}

export function getKnowledgeChunkRepository(): KnowledgeChunkRepository {
  return getDb().resolve<KnowledgeChunkRepository>(DbTokens.KnowledgeChunkRepository);
}

export function getProjectMemoryRepository(): ProjectMemoryRepository {
  return getDb().resolve<ProjectMemoryRepository>(DbTokens.ProjectMemoryRepository);
}

export function getUserWatchlistRepository(): UserWatchlistRepository {
  return getDb().resolve<UserWatchlistRepository>(DbTokens.UserWatchlistRepository);
}

export function getNotificationRepository(): NotificationRepository {
  return getDb().resolve<NotificationRepository>(DbTokens.NotificationRepository);
}

export function getNotificationSettingsRepository(): NotificationSettingsRepository {
  return getDb().resolve<NotificationSettingsRepository>(DbTokens.NotificationSettingsRepository);
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
  ProjectMemoryRepository,
  UserWatchlistRepository,
  NotificationRepository,
  NotificationSettingsRepository,
} from '@repo/db';
