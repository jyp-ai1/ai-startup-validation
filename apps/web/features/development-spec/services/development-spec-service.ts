import { isSupabaseConfigured } from '@repo/db';
import type {
  DevelopmentSpec,
  DevelopmentSpecSection,
  DevelopmentSpecWithSections,
} from '@repo/types/validation';

import {
  getDevelopmentSpecRepository,
  getDevelopmentSpecSectionRepository,
} from '@/lib/db/platform';

export async function listDevelopmentSpecs(projectId: string): Promise<DevelopmentSpec[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getDevelopmentSpecRepository();
  return repo.findByProjectId(projectId);
}

export async function findDevelopmentSpec(specId: string): Promise<DevelopmentSpec | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getDevelopmentSpecRepository();
  return repo.findById(specId);
}

export async function findDevelopmentSpecSections(
  specId: string,
): Promise<DevelopmentSpecSection[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getDevelopmentSpecSectionRepository();
  return repo.findByDevelopmentSpecId(specId);
}

export async function findDevelopmentSpecWithSections(
  projectId: string,
  specId: string,
): Promise<DevelopmentSpecWithSections | null> {
  const spec = await findDevelopmentSpec(specId);
  if (!spec || spec.projectId !== projectId) return null;
  const sections = await findDevelopmentSpecSections(specId);
  return { ...spec, sections };
}

export async function findDevelopmentSpecSectionById(
  sectionId: string,
): Promise<DevelopmentSpecSection | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getDevelopmentSpecSectionRepository();
  return repo.findById(sectionId);
}
