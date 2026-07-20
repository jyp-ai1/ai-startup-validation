import { cn } from '@repo/ui/lib/utils';

type WorkspacePanelProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: 'default' | 'none';
};

export function WorkspacePanel({
  title,
  description,
  action,
  children,
  className,
  padding = 'default',
}: WorkspacePanelProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border/70 bg-card shadow-sm',
        padding === 'default' && 'p-5',
        className,
      )}
    >
      {title ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type WorkspaceStatProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
  className?: string;
};

export function WorkspaceStat({ label, value, hint, className }: WorkspaceStatProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type WorkspaceProgressProps = {
  label: string;
  value: number;
  total: number;
  className?: string;
};

export function WorkspaceProgress({ label, value, total, className }: WorkspaceProgressProps) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
