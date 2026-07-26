import type { ID } from '@repo/types';

/** Overnight intelligence run persisted per project + date — adapter in @repo/db (Sprint 3+). */
export type BackgroundRunRecord = {
  id: ID;
  projectId: string;
  runDate: string;
  ranAt: string;
  providerId: string;
  investigationCount: number;
  importantCount: number;
  payload: Record<string, unknown>;
};

export type BackgroundRunCreate = Omit<BackgroundRunRecord, 'id'>;

export interface BackgroundRunRepository {
  findLatestByProject(projectId: string): Promise<BackgroundRunRecord | null>;
  findByProjectAndDate(projectId: string, runDate: string): Promise<BackgroundRunRecord | null>;
  save(run: BackgroundRunCreate): Promise<BackgroundRunRecord>;
}
