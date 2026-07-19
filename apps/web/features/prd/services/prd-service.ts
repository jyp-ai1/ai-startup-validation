import { isSupabaseConfigured } from '@repo/db';
import type { PRD, PRDSection, PRDWithSections } from '@repo/types/validation';

import { getPRDRepository, getPRDSectionRepository } from '@/lib/db/platform';

export async function listPRDs(projectId: string): Promise<PRD[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getPRDRepository();
  return repo.findByProjectId(projectId);
}

export async function findPRD(prdId: string): Promise<PRD | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getPRDRepository();
  return repo.findById(prdId);
}

export async function findPRDSections(prdId: string): Promise<PRDSection[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getPRDSectionRepository();
  return repo.findByPRDId(prdId);
}

export async function findPRDWithSections(
  projectId: string,
  prdId: string,
): Promise<PRDWithSections | null> {
  const prd = await findPRD(prdId);
  if (!prd || prd.projectId !== projectId) return null;
  const sections = await findPRDSections(prdId);
  return { ...prd, sections };
}

export async function findPRDSectionById(sectionId: string): Promise<PRDSection | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getPRDSectionRepository();
  return repo.findById(sectionId);
}
