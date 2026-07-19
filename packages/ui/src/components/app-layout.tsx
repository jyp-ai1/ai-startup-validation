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
          <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block">
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
        'sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6',
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
    <nav className={cn('flex h-full flex-col gap-1 p-4', className)}>
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
        'mt-auto border-t border-border bg-muted/30 px-4 py-4 text-center text-sm text-muted-foreground lg:px-6',
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
    <div className={cn('flex-1 p-4 lg:p-6', className)}>{children}</div>
  );
}
