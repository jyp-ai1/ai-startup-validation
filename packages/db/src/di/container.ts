import { InternalServerError } from '@repo/core/errors';

import { SupabaseAuthAdapter } from '../adapters/supabase/auth/auth.adapter';
import { SupabaseRealtimeAdapter } from '../adapters/supabase/realtime/realtime.adapter';
import { SupabaseStorageAdapter } from '../adapters/supabase/storage/storage.adapter';
import type { AuthPort } from '../auth/auth.port';
import { isSupabaseConfigured } from '../env/env';
import type { RealtimePort } from '../realtime/realtime.port';
import type { OrganizationRepository } from '../repositories/organization.repository';
import { SupabaseOrganizationRepository } from '../repositories/organization.repository';
import type { ProjectRepository } from '../repositories/project.repository';
import { SupabaseProjectRepository } from '../repositories/project.repository';
import type { CompetitorRepository } from '../repositories/competitor.repository';
import { SupabaseCompetitorRepository } from '../repositories/competitor.repository';
import type { EvidenceRepository } from '../repositories/evidence.repository';
import { SupabaseEvidenceRepository } from '../repositories/evidence.repository';
import type { ResearchPlanRepository } from '../repositories/research-plan.repository';
import { SupabaseResearchPlanRepository } from '../repositories/research-plan.repository';
import type { StartupProjectRepository } from '../repositories/startup-project.repository';
import { SupabaseStartupProjectRepository } from '../repositories/startup-project.repository';
import type { GovernmentGrantRepository } from '../repositories/government-grant.repository';
import { SupabaseGovernmentGrantRepository } from '../repositories/government-grant.repository';
import type { VOCRepository } from '../repositories/voc.repository';
import { SupabaseVOCRepository } from '../repositories/voc.repository';
import type { ValidationScoreRepository } from '../repositories/validation-score.repository';
import { SupabaseValidationScoreRepository } from '../repositories/validation-score.repository';
import type { ValidationReportRepository } from '../repositories/validation-report.repository';
import { SupabaseValidationReportRepository } from '../repositories/validation-report.repository';
import type { ReportSectionRepository } from '../repositories/report-section.repository';
import { SupabaseReportSectionRepository } from '../repositories/report-section.repository';
import type { AIReportGenerationRepository } from '../repositories/ai-report-generation.repository';
import { SupabaseAIReportGenerationRepository } from '../repositories/ai-report-generation.repository';
import type { BusinessPlanRepository } from '../repositories/business-plan.repository';
import { SupabaseBusinessPlanRepository } from '../repositories/business-plan.repository';
import type { BusinessPlanSectionRepository } from '../repositories/business-plan-section.repository';
import { SupabaseBusinessPlanSectionRepository } from '../repositories/business-plan-section.repository';
import type { PRDRepository } from '../repositories/prd-document.repository';
import { SupabasePRDRepository } from '../repositories/prd-document.repository';
import type { PRDSectionRepository } from '../repositories/prd-section.repository';
import { SupabasePRDSectionRepository } from '../repositories/prd-section.repository';
import type { DevelopmentSpecRepository } from '../repositories/development-spec.repository';
import { SupabaseDevelopmentSpecRepository } from '../repositories/development-spec.repository';
import type { DevelopmentSpecSectionRepository } from '../repositories/development-spec-section.repository';
import { SupabaseDevelopmentSpecSectionRepository } from '../repositories/development-spec-section.repository';
import type { KnowledgeDocumentRepository } from '../repositories/knowledge-document.repository';
import { SupabaseKnowledgeDocumentRepository } from '../repositories/knowledge-document.repository';
import type { KnowledgeChunkRepository } from '../repositories/knowledge-chunk.repository';
import { SupabaseKnowledgeChunkRepository } from '../repositories/knowledge-chunk.repository';
import type { ProjectMemoryRepository } from '../repositories/project-memory.repository';
import { SupabaseProjectMemoryRepository } from '../repositories/project-memory.repository';
import type { UserRepository } from '../repositories/user.repository';
import { SupabaseUserRepository } from '../repositories/user.repository';
import type { StoragePort } from '../storage/storage.port';

/** DI tokens — resolve interfaces, never concrete Supabase classes in apps. */
export const DbTokens = {
  UserRepository: Symbol('UserRepository'),
  OrganizationRepository: Symbol('OrganizationRepository'),
  ProjectRepository: Symbol('ProjectRepository'),
  StartupProjectRepository: Symbol('StartupProjectRepository'),
  ResearchPlanRepository: Symbol('ResearchPlanRepository'),
  EvidenceRepository: Symbol('EvidenceRepository'),
  CompetitorRepository: Symbol('CompetitorRepository'),
  VOCRepository: Symbol('VOCRepository'),
  GovernmentGrantRepository: Symbol('GovernmentGrantRepository'),
  ValidationScoreRepository: Symbol('ValidationScoreRepository'),
  ValidationReportRepository: Symbol('ValidationReportRepository'),
  ReportSectionRepository: Symbol('ReportSectionRepository'),
  AIReportGenerationRepository: Symbol('AIReportGenerationRepository'),
  BusinessPlanRepository: Symbol('BusinessPlanRepository'),
  BusinessPlanSectionRepository: Symbol('BusinessPlanSectionRepository'),
  PRDRepository: Symbol('PRDRepository'),
  PRDSectionRepository: Symbol('PRDSectionRepository'),
  DevelopmentSpecRepository: Symbol('DevelopmentSpecRepository'),
  DevelopmentSpecSectionRepository: Symbol('DevelopmentSpecSectionRepository'),
  KnowledgeDocumentRepository: Symbol('KnowledgeDocumentRepository'),
  KnowledgeChunkRepository: Symbol('KnowledgeChunkRepository'),
  ProjectMemoryRepository: Symbol('ProjectMemoryRepository'),
  AuthPort: Symbol('AuthPort'),
  StoragePort: Symbol('StoragePort'),
  RealtimePort: Symbol('RealtimePort'),
} as const;

export type DatabasePlatform = {
  repositories: {
    user: UserRepository;
    organization: OrganizationRepository;
    project: ProjectRepository;
    startupProject: StartupProjectRepository;
    researchPlan: ResearchPlanRepository;
    evidence: EvidenceRepository;
    competitor: CompetitorRepository;
    voc: VOCRepository;
    governmentGrant: GovernmentGrantRepository;
    validationScore: ValidationScoreRepository;
    validationReport: ValidationReportRepository;
    reportSection: ReportSectionRepository;
    aiReportGeneration: AIReportGenerationRepository;
    businessPlan: BusinessPlanRepository;
    businessPlanSection: BusinessPlanSectionRepository;
    prd: PRDRepository;
    prdSection: PRDSectionRepository;
    developmentSpec: DevelopmentSpecRepository;
    developmentSpecSection: DevelopmentSpecSectionRepository;
    knowledgeDocument: KnowledgeDocumentRepository;
    knowledgeChunk: KnowledgeChunkRepository;
    projectMemory: ProjectMemoryRepository;
  };
  auth: AuthPort;
  storage: StoragePort;
  realtime: RealtimePort;
  isConfigured: boolean;
};

type ContainerRegistry = Map<symbol, unknown>;

/** Simple DI container — swap adapters without changing consumers. */
export class DbContainer {
  private readonly registry: ContainerRegistry = new Map();

  register<T>(token: symbol, instance: T): this {
    this.registry.set(token, instance);
    return this;
  }

  resolve<T>(token: symbol): T {
    const instance = this.registry.get(token);
    if (!instance) {
      throw new InternalServerError(
        `No binding registered for token: ${token.toString()}`,
      );
    }
    return instance as T;
  }

  /** Convenience accessors matching DatabasePlatform shape. */
  get platform(): DatabasePlatform {
    return {
      repositories: {
        user: this.resolve<UserRepository>(DbTokens.UserRepository),
        organization: this.resolve<OrganizationRepository>(
          DbTokens.OrganizationRepository,
        ),
        project: this.resolve<ProjectRepository>(DbTokens.ProjectRepository),
        startupProject: this.resolve<StartupProjectRepository>(
          DbTokens.StartupProjectRepository,
        ),
        researchPlan: this.resolve<ResearchPlanRepository>(
          DbTokens.ResearchPlanRepository,
        ),
        evidence: this.resolve<EvidenceRepository>(DbTokens.EvidenceRepository),
        competitor: this.resolve<CompetitorRepository>(
          DbTokens.CompetitorRepository,
        ),
        voc: this.resolve<VOCRepository>(DbTokens.VOCRepository),
        governmentGrant: this.resolve<GovernmentGrantRepository>(
          DbTokens.GovernmentGrantRepository,
        ),
        validationScore: this.resolve<ValidationScoreRepository>(
          DbTokens.ValidationScoreRepository,
        ),
        validationReport: this.resolve<ValidationReportRepository>(
          DbTokens.ValidationReportRepository,
        ),
        reportSection: this.resolve<ReportSectionRepository>(
          DbTokens.ReportSectionRepository,
        ),
        aiReportGeneration: this.resolve<AIReportGenerationRepository>(
          DbTokens.AIReportGenerationRepository,
        ),
        businessPlan: this.resolve<BusinessPlanRepository>(
          DbTokens.BusinessPlanRepository,
        ),
        businessPlanSection: this.resolve<BusinessPlanSectionRepository>(
          DbTokens.BusinessPlanSectionRepository,
        ),
        prd: this.resolve<PRDRepository>(DbTokens.PRDRepository),
        prdSection: this.resolve<PRDSectionRepository>(DbTokens.PRDSectionRepository),
        developmentSpec: this.resolve<DevelopmentSpecRepository>(
          DbTokens.DevelopmentSpecRepository,
        ),
        developmentSpecSection: this.resolve<DevelopmentSpecSectionRepository>(
          DbTokens.DevelopmentSpecSectionRepository,
        ),
        knowledgeDocument: this.resolve<KnowledgeDocumentRepository>(
          DbTokens.KnowledgeDocumentRepository,
        ),
        knowledgeChunk: this.resolve<KnowledgeChunkRepository>(DbTokens.KnowledgeChunkRepository),
        projectMemory: this.resolve<ProjectMemoryRepository>(DbTokens.ProjectMemoryRepository),
      },
      auth: this.resolve<AuthPort>(DbTokens.AuthPort),
      storage: this.resolve<StoragePort>(DbTokens.StoragePort),
      realtime: this.resolve<RealtimePort>(DbTokens.RealtimePort),
      isConfigured: isSupabaseConfigured(),
    };
  }
}

/** Create a container wired to Supabase adapters (default platform). */
export function createDatabasePlatform(): DbContainer {
  const userRepo = new SupabaseUserRepository();
  const orgRepo = new SupabaseOrganizationRepository();
  const projectRepo = new SupabaseProjectRepository();
  const startupProjectRepo = new SupabaseStartupProjectRepository();
  const researchPlanRepo = new SupabaseResearchPlanRepository();
  const evidenceRepo = new SupabaseEvidenceRepository();
  const competitorRepo = new SupabaseCompetitorRepository();
  const vocRepo = new SupabaseVOCRepository();
  const governmentGrantRepo = new SupabaseGovernmentGrantRepository();
  const validationScoreRepo = new SupabaseValidationScoreRepository();
  const validationReportRepo = new SupabaseValidationReportRepository();
  const reportSectionRepo = new SupabaseReportSectionRepository();
  const aiReportGenerationRepo = new SupabaseAIReportGenerationRepository();
  const businessPlanRepo = new SupabaseBusinessPlanRepository();
  const businessPlanSectionRepo = new SupabaseBusinessPlanSectionRepository();
  const prdRepo = new SupabasePRDRepository();
  const prdSectionRepo = new SupabasePRDSectionRepository();
  const developmentSpecRepo = new SupabaseDevelopmentSpecRepository();
  const developmentSpecSectionRepo = new SupabaseDevelopmentSpecSectionRepository();
  const knowledgeDocumentRepo = new SupabaseKnowledgeDocumentRepository();
  const knowledgeChunkRepo = new SupabaseKnowledgeChunkRepository();
  const projectMemoryRepo = new SupabaseProjectMemoryRepository();
  const auth = new SupabaseAuthAdapter();
  const storage = new SupabaseStorageAdapter();
  const realtime = new SupabaseRealtimeAdapter();

  return new DbContainer()
    .register(DbTokens.UserRepository, userRepo)
    .register(DbTokens.OrganizationRepository, orgRepo)
    .register(DbTokens.ProjectRepository, projectRepo)
    .register(DbTokens.StartupProjectRepository, startupProjectRepo)
    .register(DbTokens.ResearchPlanRepository, researchPlanRepo)
    .register(DbTokens.EvidenceRepository, evidenceRepo)
    .register(DbTokens.CompetitorRepository, competitorRepo)
    .register(DbTokens.VOCRepository, vocRepo)
    .register(DbTokens.GovernmentGrantRepository, governmentGrantRepo)
    .register(DbTokens.ValidationScoreRepository, validationScoreRepo)
    .register(DbTokens.ValidationReportRepository, validationReportRepo)
    .register(DbTokens.ReportSectionRepository, reportSectionRepo)
    .register(DbTokens.AIReportGenerationRepository, aiReportGenerationRepo)
    .register(DbTokens.BusinessPlanRepository, businessPlanRepo)
    .register(DbTokens.BusinessPlanSectionRepository, businessPlanSectionRepo)
    .register(DbTokens.PRDRepository, prdRepo)
    .register(DbTokens.PRDSectionRepository, prdSectionRepo)
    .register(DbTokens.DevelopmentSpecRepository, developmentSpecRepo)
    .register(DbTokens.DevelopmentSpecSectionRepository, developmentSpecSectionRepo)
    .register(DbTokens.KnowledgeDocumentRepository, knowledgeDocumentRepo)
    .register(DbTokens.KnowledgeChunkRepository, knowledgeChunkRepo)
    .register(DbTokens.ProjectMemoryRepository, projectMemoryRepo)
    .register(DbTokens.AuthPort, auth)
    .register(DbTokens.StoragePort, storage)
    .register(DbTokens.RealtimePort, realtime);
}

let defaultContainer: DbContainer | null = null;

/** Singleton platform — lazy init for app usage. */
export function getDatabasePlatform(): DbContainer {
  if (!defaultContainer) {
    defaultContainer = createDatabasePlatform();
  }
  return defaultContainer;
}

/** Resolve a repository from the default container. */
export function resolveRepository<T>(token: symbol): T {
  return getDatabasePlatform().resolve<T>(token);
}
