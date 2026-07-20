'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { WorkspaceBreadcrumb } from './workspace-breadcrumb';

type WorkspaceRouteBreadcrumbProps = {
  projectTitle?: string | null;
  projectId?: string | null;
};

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

export function WorkspaceRouteBreadcrumb({
  projectTitle,
  projectId,
}: WorkspaceRouteBreadcrumbProps) {
  const pathname = usePathname();
  const t = useTranslations();

  const match = pathname.match(/\/projects\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return null;

  const routeProjectId = match[1];
  const segment = match[2];
  const title = projectTitle ?? t('nav.projects');
  const id = projectId ?? routeProjectId;

  const items = [
    { label: t('workspace.breadcrumb.workspace'), href: '/dashboard' },
    { label: title, href: `/projects/${id}` },
  ];

  if (segment && SEGMENT_LABEL_KEYS[segment]) {
    items.push({
      label: t(SEGMENT_LABEL_KEYS[segment] as 'nav.research'),
      href: `/projects/${id}/${segment}`,
    });
  }

  return <WorkspaceBreadcrumb items={items} className="mb-4" />;
}
