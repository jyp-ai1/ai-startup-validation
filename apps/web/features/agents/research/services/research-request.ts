import type { AppLocale } from '@repo/i18n/config';
import type { StartupProject } from '@repo/types/validation';

import type { ResearchRequest } from './research-agent-types';

export function projectToResearchRequest(
  project: Pick<
    StartupProject,
    'id' | 'title' | 'projectType' | 'industry' | 'targetCustomer'
  >,
  language: AppLocale,
  country: string | null = null,
): ResearchRequest {
  return {
    projectId: project.id,
    projectTitle: project.title,
    projectType: project.projectType,
    industry: project.industry,
    country,
    language,
    targetCustomer: project.targetCustomer,
  };
}

function localeToCountry(locale: AppLocale): string | null {
  switch (locale) {
    case 'ko':
      return 'KR';
    case 'ja':
      return 'JP';
    case 'zh-CN':
    case 'zh-TW':
      return 'CN';
    default:
      return 'US';
  }
}

export function projectToResearchRequestWithLocale(
  project: Pick<
    StartupProject,
    'id' | 'title' | 'projectType' | 'industry' | 'targetCustomer'
  >,
  locale: AppLocale,
): ResearchRequest {
  return projectToResearchRequest(project, locale, localeToCountry(locale));
}
