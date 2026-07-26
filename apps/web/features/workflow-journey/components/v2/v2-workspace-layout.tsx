'use client';

import { V2WorkspaceShell } from './v2-workspace-shell';

type V2WorkspaceLayoutProps = {
  aiPm: React.ReactNode;
  decision: React.ReactNode;
  embedded?: boolean;
  className?: string;
  stackAt?: 'md' | 'lg';
};

/** V2 daily workspace — replaces FounderWorkspaceLayout 3-col shell. */
export function V2WorkspaceLayout({
  aiPm,
  decision,
  embedded,
  className,
  stackAt,
}: V2WorkspaceLayoutProps) {
  return (
    <V2WorkspaceShell
      aiPm={aiPm}
      decision={decision}
      embedded={embedded}
      className={className}
      stackAt={stackAt}
    />
  );
}
