'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';

import { LandingCtaLink } from './landing-cta-link';

const LocaleSwitcher = dynamic(
  () => import('@/components/locale-switcher').then((m) => m.LocaleSwitcher),
  { ssr: false, loading: () => <span className="inline-block h-8 w-[4.5rem] rounded-md bg-muted/60" aria-hidden /> },
);

const TrackedThemeToggle = dynamic(
  () => import('@/components/analytics/tracked-theme-toggle').then((m) => m.TrackedThemeToggle),
  { ssr: false, loading: () => <span className="inline-block size-8 rounded-md bg-muted/60" aria-hidden /> },
);

type NavLink = { href: string; label: string; key: string };

type LandingHeaderControlsProps = {
  navLinks: NavLink[];
  labels: {
    menuLabel: string;
    openMenu: string;
    closeMenu: string;
    signIn: string;
    startFree: string;
  };
};

export function LandingHeaderControls({ navLinks, labels }: LandingHeaderControlsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="relative isolate flex shrink-0 items-center gap-2 sm:gap-2.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label={labels.openMenu}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        {mounted ? (
          <>
            <LocaleSwitcher />
            <TrackedThemeToggle />
          </>
        ) : (
          <>
            <span className="inline-block h-8 w-[4.5rem] rounded-md bg-muted/60" aria-hidden />
            <span className="inline-block size-8 rounded-md bg-muted/60" aria-hidden />
          </>
        )}
        <Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
          <Link href="/auth/login?next=/workspace">{labels.signIn}</Link>
        </Button>
        <LandingCtaLink
          href="/auth/login?next=/workspace"
          event="cta_start"
          size="sm"
          className="h-9 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90 sm:px-4"
        >
          {labels.startFree}
        </LandingCtaLink>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-sm">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 py-3">
            <DialogTitle className="text-base">{labels.menuLabel}</DialogTitle>
            <Button variant="ghost" size="icon-sm" aria-label={labels.closeMenu} onClick={() => setMobileOpen(false)}>
              <X className="size-4" />
            </Button>
          </DialogHeader>
          <nav className="flex flex-col p-2" aria-label={labels.menuLabel}>
            {navLinks.map(({ href, label, key }) => (
              <a
                key={key}
                href={href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </a>
            ))}
            <Link
              href="/auth/login?next=/workspace"
              className="mt-2 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              {labels.signIn}
            </Link>
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
