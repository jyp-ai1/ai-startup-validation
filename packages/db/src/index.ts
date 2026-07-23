// Environment
export { dbEnv, isSupabaseConfigured, isSupabaseAdminConfigured } from './env/env';
export type { DbEnv } from './env/env';

// DI Container
export {
  DbContainer,
  DbTokens,
  createDatabasePlatform,
  getDatabasePlatform,
  resolveRepository,
} from './di/container';
export type { DatabasePlatform } from './di/container';

// Ports (interfaces — depend on these in apps/services)
export type { AuthPort } from './auth/auth.port';
export type { StoragePort, StorageObject, UploadOptions } from './storage/storage.port';
export type {
  RealtimePort,
  RealtimeSubscription,
  RealtimeMessageHandler,
} from './realtime/realtime.port';

// Repository interfaces + Supabase implementations
export type { UserRepository } from './repositories/user.repository';
export { SupabaseUserRepository } from './repositories/user.repository';
export type { OrganizationRepository } from './repositories/organization.repository';
export { SupabaseOrganizationRepository } from './repositories/organization.repository';
export type { ProjectRepository } from './repositories/project.repository';
export { SupabaseProjectRepository } from './repositories/project.repository';
export type { StartupProjectRepository } from './repositories/startup-project.repository';
export { SupabaseStartupProjectRepository } from './repositories/startup-project.repository';
export type { ResearchPlanRepository } from './repositories/research-plan.repository';
export { SupabaseResearchPlanRepository } from './repositories/research-plan.repository';
export type { EvidenceRepository } from './repositories/evidence.repository';
export { SupabaseEvidenceRepository } from './repositories/evidence.repository';
export type { CompetitorRepository } from './repositories/competitor.repository';
export { SupabaseCompetitorRepository } from './repositories/competitor.repository';
export type { VOCRepository } from './repositories/voc.repository';
export { SupabaseVOCRepository } from './repositories/voc.repository';
export type { GovernmentGrantRepository } from './repositories/government-grant.repository';
export { SupabaseGovernmentGrantRepository } from './repositories/government-grant.repository';
export type { ValidationScoreRepository } from './repositories/validation-score.repository';
export { SupabaseValidationScoreRepository } from './repositories/validation-score.repository';
export type { ValidationReportRepository } from './repositories/validation-report.repository';
export { SupabaseValidationReportRepository } from './repositories/validation-report.repository';
export type { ReportSectionRepository } from './repositories/report-section.repository';
export { SupabaseReportSectionRepository } from './repositories/report-section.repository';
export type { AIReportGenerationRepository } from './repositories/ai-report-generation.repository';
export { SupabaseAIReportGenerationRepository } from './repositories/ai-report-generation.repository';
export type { BusinessPlanRepository } from './repositories/business-plan.repository';
export { SupabaseBusinessPlanRepository } from './repositories/business-plan.repository';
export type { BusinessPlanSectionRepository } from './repositories/business-plan-section.repository';
export { SupabaseBusinessPlanSectionRepository } from './repositories/business-plan-section.repository';
export type { PRDRepository } from './repositories/prd-document.repository';
export { SupabasePRDRepository } from './repositories/prd-document.repository';
export type { PRDSectionRepository } from './repositories/prd-section.repository';
export { SupabasePRDSectionRepository } from './repositories/prd-section.repository';
export type { DevelopmentSpecRepository } from './repositories/development-spec.repository';
export { SupabaseDevelopmentSpecRepository } from './repositories/development-spec.repository';
export type { DevelopmentSpecSectionRepository } from './repositories/development-spec-section.repository';
export { SupabaseDevelopmentSpecSectionRepository } from './repositories/development-spec-section.repository';
export type { KnowledgeDocumentRepository } from './repositories/knowledge-document.repository';
export { SupabaseKnowledgeDocumentRepository } from './repositories/knowledge-document.repository';
export type { KnowledgeChunkRepository } from './repositories/knowledge-chunk.repository';
export { SupabaseKnowledgeChunkRepository } from './repositories/knowledge-chunk.repository';
export type {
  ProjectMemoryRepository,
  ProjectMemoryEntry,
  ProjectMemoryType,
  CreateProjectMemoryInput,
  UpdateProjectMemoryInput,
} from './repositories/project-memory.repository';
export {
  SupabaseProjectMemoryRepository,
  PROJECT_MEMORY_TYPES,
} from './repositories/project-memory.repository';
export type {
  UserWatchlistRepository,
  UserWatchlistEntry,
  CreateWatchlistInput,
  WatchType,
} from './repositories/user-watchlist.repository';
export {
  SupabaseUserWatchlistRepository,
  WATCH_TYPES,
} from './repositories/user-watchlist.repository';
export type {
  NotificationRepository,
  NotificationRecord,
  CreateNotificationInput,
  NotificationPriority,
  NotificationCategory,
} from './repositories/notification.repository';
export {
  SupabaseNotificationRepository,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CATEGORIES,
} from './repositories/notification.repository';
export type {
  NotificationSettingsRepository,
  NotificationSettingsRecord,
  UpsertNotificationSettingsInput,
} from './repositories/notification-settings.repository';
export { SupabaseNotificationSettingsRepository } from './repositories/notification-settings.repository';

// Adapters (use via container — avoid direct imports in apps when possible)
export { SupabaseAuthAdapter } from './adapters/supabase/auth/auth.adapter';
export { SupabaseStorageAdapter } from './adapters/supabase/storage/storage.adapter';
export { SupabaseRealtimeAdapter } from './adapters/supabase/realtime/realtime.adapter';

// Client factory (for advanced server/browser setup in apps — still no supabase-js in apps)
export {
  SupabaseClientFactory,
  getSupabaseClientFactory,
} from './adapters/supabase/client';
export { createBrowserClient, getBrowserClient } from './adapters/supabase/browser';
export { createServerClient } from './adapters/supabase/server';
export { createAdminClient, getAdminClient } from './adapters/supabase/admin';
export { createServiceClient, getServiceClient } from './adapters/supabase/service';

// Migration & seed
export { seedDatabase } from './seed/index';

// Auth types
export type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  SignUpInput,
} from './types/auth.types';
