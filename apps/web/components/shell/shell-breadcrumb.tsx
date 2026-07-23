'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { WorkspaceBreadcrumb } from '@/components/workspace/workspace-breadcrumb';

const SEGMENT_LABEL_KEYS: Record<string, string> = {
  research: 'nav.research',
  evidence: 'nav.evidence',
  voc: 'nav.voc',
  competitors: 'nav.competitors',
  grants: 'nav.grants',
  validation: 'nav.validation',
  reports: 'nav.reports',
  'business-plan': 'nav.businessPlan',
  prd: 'nav.prd',
  'development-spec': 'nav.devSpec',
  knowledge: 'nav.knowledge',
  agent: 'nav.agentConsultant',
  studio: 'nav.aiStudio',
};

type ShellBreadcrumbProps = {
  projectTitle?: string | null;
  projectId?: string | null;
};

export function ShellBreadcrumb({ projectTitle, projectId }: ShellBreadcrumbProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const homeLabel = t('workspace.breadcrumb.home');

  const isDashboard = /\/dashboard\/?$/.test(pathname);
  const projectMatch = pathname.match(/\/projects\/([^/]+)(?:\/([^/]+))?/);

  if (isDashboard) {
    const items = [
      { label: homeLabel, href: '/' },
      { label: t('nav.dashboard') },
    ];
    return <WorkspaceBreadcrumb items={items} className="text-[13px]" />;
  }

  if (projectMatch) {
    const routeProjectId = projectMatch[1];
    const segment = projectMatch[2];
    const id = projectId ?? routeProjectId;
    const title = projectTitle ?? t('nav.projects');

    const items = [
      { label: homeLabel, href: '/' },
      { label: t('nav.projects'), href: '/projects' },
      { label: title, href: `/projects/${id}` },
    ];

    if (segment && SEGMENT_LABEL_KEYS[segment]) {
      items.push({
        label: t(SEGMENT_LABEL_KEYS[segment] as 'nav.research'),
        href: `/projects/${id}/${segment}`,
      });
    }

    return <WorkspaceBreadcrumb items={items} className="text-[13px]" />;
  }

  if (pathname.startsWith('/projects')) {
    return (
      <WorkspaceBreadcrumb
        items={[
          { label: homeLabel, href: '/' },
          { label: t('nav.projects') },
        ]}
        className="text-[13px]"
      />
    );
  }

  if (pathname.startsWith('/settings')) {
    return (
      <WorkspaceBreadcrumb
        items={[
          { label: homeLabel, href: '/' },
          { label: t('nav.settings') },
        ]}
        className="text-[13px]"
      />
    );
  }

  return null;
}
