'use client';

import { useTranslations } from 'next-intl';

import type { DashboardNextAction } from '@/features/dashboard/types';

import { WorkspaceInsightPanel } from './workspace-insight-panel';
import { WorkspaceLayout } from './workspace-layout';

type WorkspaceFeatureShellClientProps = {
  projectId: string;
  nextActions: DashboardNextAction[];
  highlights: string[];
  children: React.ReactNode;
};

export function WorkspaceFeatureShellClient({
  projectId,
  nextActions,
  highlights,
  children,
}: WorkspaceFeatureShellClientProps) {
  const t = useTranslations();
  const translatedHighlights = highlights.map((key) => t(key));

  return (
    <WorkspaceLayout
      insight={
        <WorkspaceInsightPanel
          projectId={projectId}
          nextActions={nextActions}
          highlights={translatedHighlights}
        />
      }
    >
      {children}
    </WorkspaceLayout>
  );
}
