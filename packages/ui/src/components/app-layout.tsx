import { cn } from '@repo/ui/lib/utils';

type AppLayoutProps = {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AppLayout({
  header,
  sidebar,
  footer,
  children,
  className,
}: AppLayoutProps) {
  return (
    <div className={cn('flex min-h-full flex-col bg-background', className)}>
      {header}
      <div className="flex flex-1">
        {sidebar ? (
          <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
            {sidebar}
          </aside>
        ) : null}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
      {footer}
    </div>
  );
}

export function AppHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-14 items-center border-b border-border/80 bg-background/90 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:px-6',
        className,
      )}
    >
      {children}
    </header>
  );
}

export function AppSidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav className={cn('flex h-full flex-col gap-6 p-4', className)}>
      {children}
    </nav>
  );
}

export function AppFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        'border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground lg:px-6',
        className,
      )}
    >
      {children}
    </footer>
  );
}

export function AppContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8', className)}>{children}</div>
  );
}
