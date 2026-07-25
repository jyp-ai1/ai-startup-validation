import type { ProjectOverviewCard } from '@/features/dashboard/services/dashboard-service';
import type { StartupProjectStatus, ProjectType } from '@repo/types/validation';

export type ProjectSortKey = 'updated' | 'created' | 'title' | 'score';

export type ProjectListFilters = {
  query: string;
  status: StartupProjectStatus | 'ALL';
  projectType: ProjectType | 'ALL';
  showArchived: boolean;
  pinnedOnly: boolean;
  sort: ProjectSortKey;
};

export const DEFAULT_PROJECT_LIST_FILTERS: ProjectListFilters = {
  query: '',
  status: 'ALL',
  projectType: 'ALL',
  showArchived: false,
  pinnedOnly: false,
  sort: 'updated',
};

export function filterAndSortProjects(
  overviews: ProjectOverviewCard[],
  filters: ProjectListFilters,
): ProjectOverviewCard[] {
  const query = filters.query.trim().toLowerCase();

  let result = overviews.filter(({ project }) => {
    if (!filters.showArchived && project.status === 'ARCHIVED') return false;
    if (filters.pinnedOnly && !project.isPinned) return false;
    if (filters.status !== 'ALL' && project.status !== filters.status) return false;
    if (filters.projectType !== 'ALL' && project.projectType !== filters.projectType) return false;

    if (!query) return true;
    const haystack = [project.title, project.summary, project.industry ?? ''].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  result = [...result].sort((a, b) => {
    switch (filters.sort) {
      case 'created':
        return new Date(b.project.createdAt).getTime() - new Date(a.project.createdAt).getTime();
      case 'title':
        return a.project.title.localeCompare(b.project.title, 'ko');
      case 'score': {
        const scoreA = a.validationScore?.totalScore ?? -1;
        const scoreB = b.validationScore?.totalScore ?? -1;
        return scoreB - scoreA;
      }
      case 'updated':
      default:
        return new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime();
    }
  });

  if (filters.sort !== 'title') {
    result.sort((a, b) => Number(b.project.isPinned) - Number(a.project.isPinned));
  }

  return result;
}
