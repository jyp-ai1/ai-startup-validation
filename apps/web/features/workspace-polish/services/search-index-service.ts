import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { IntelligenceViewModel } from '@/features/project-intelligence';
import type { StartupProject } from '@repo/types/validation';

import type { WorkspaceSearchItem } from '../types';

type SearchIndexInput = {
  project: StartupProject;
  stats: ProjectDashboardStats;
  intelligence?: IntelligenceViewModel | null;
};

export function buildWorkspaceSearchIndex(input: SearchIndexInput): WorkspaceSearchItem[] {
  const { project, stats, intelligence } = input;
  const projectId = project.id;
  const base = `/projects/${projectId}`;
  const items: WorkspaceSearchItem[] = [
    {
      id: 'project-home',
      category: 'project',
      title: project.title,
      subtitle: project.summary || undefined,
      href: base,
      keywords: [project.industry ?? '', project.projectType ?? ''],
    },
    {
      id: 'research',
      category: 'research',
      title: 'Research plans',
      subtitle: `${stats.research.total} plans`,
      href: `${base}/research`,
    },
    {
      id: 'evidence',
      category: 'evidence',
      title: 'Evidence library',
      subtitle: `${stats.evidence.total} items`,
      href: `${base}/evidence`,
    },
    {
      id: 'decision',
      category: 'decision',
      title: 'Decision center',
      href: `${base}/decision`,
    },
    {
      id: 'report',
      category: 'report',
      title: 'Executive report',
      href: `${base}/executive-report`,
    },
    {
      id: 'agent',
      category: 'research',
      title: 'AI research agent',
      href: `${base}/agent`,
    },
  ];

  if (intelligence) {
    for (const memory of intelligence.memories.slice(0, 12)) {
      items.push({
        id: `memory-${memory.id}`,
        category: 'memory',
        title: memory.title,
        subtitle: memory.summary ?? memory.memoryType,
        href: base,
        keywords: [memory.memoryType],
      });
    }
  }

  for (const activity of stats.recentActivity.slice(0, 8)) {
    items.push({
      id: `activity-${activity.id}`,
      category: activity.type === 'REPORT' ? 'report' : 'research',
      title: activity.label,
      subtitle: activity.type,
      href: base,
    });
  }

  return items;
}

export function filterSearchItems(items: WorkspaceSearchItem[], query: string): WorkspaceSearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 12);

  return items
    .filter((item) => {
      const haystack = [item.title, item.subtitle, ...(item.keywords ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 12);
}
