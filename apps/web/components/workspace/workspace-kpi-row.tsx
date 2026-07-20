import { cn } from '@repo/ui/lib/utils';

import { WorkspacePanel, WorkspaceStat } from './workspace-panel';

export type WorkspaceKpiItem = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

type WorkspaceKpiRowProps = {
  items: WorkspaceKpiItem[];
  className?: string;
};

export function WorkspaceKpiRow({ items, className }: WorkspaceKpiRowProps) {
  return (
    <WorkspacePanel padding="default" className={cn('motion-safe:animate-in motion-safe:fade-in', className)}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <WorkspaceStat key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>
    </WorkspacePanel>
  );
}
