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
          <aside className="hidden w-[260px] shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
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
        'sticky top-0 z-50 flex h-[72px] items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 lg:px-10',
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
    <nav className={cn('flex h-full flex-col gap-8 p-5', className)}>
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
    <div className={cn('mx-auto w-full max-w-[1440px] flex-1 px-6 py-10 lg:px-10 lg:py-12', className)}>
      {children}
    </div>
  );
}
