import { cn } from '@repo/ui/lib/utils';

type WorkspaceLayoutProps = {
  children: React.ReactNode;
  insight?: React.ReactNode;
  className?: string;
};

export function WorkspaceLayout({ children, insight, className }: WorkspaceLayoutProps) {
  if (!insight) {
    return <div className={cn('space-y-6', className)}>{children}</div>;
  }

  return (
    <div className={cn('grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]', className)}>
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">{insight}</aside>
    </div>
  );
}
