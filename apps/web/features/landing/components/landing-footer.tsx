'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bug, Lightbulb } from 'lucide-react';

import { BetaBadge } from '@/components/beta-badge';
import { SITE_LINKS } from '@/lib/site/beta-config';

import { LANDING_CONTAINER } from '../lib/landing-layout';

export function LandingFooter() {
  const t = useTranslations('landing.footer');

  const links = [
    { href: '/privacy', label: t('privacy') },
    { href: '/terms', label: t('terms') },
    { href: '/about', label: t('about') },
    { href: `mailto:${SITE_LINKS.email}`, label: t('contact'), external: true },
    { href: SITE_LINKS.bugReport, label: t('bugReport'), external: true },
    { href: SITE_LINKS.featureRequest, label: t('featureRequest'), external: true },
    { href: SITE_LINKS.github, label: 'GitHub', external: true },
  ];

  return (
    <>
      <footer className="border-t border-border/60 bg-card py-12">
        <div className={LANDING_CONTAINER}>
          <div className="mb-6 flex justify-center">
            <BetaBadge />
          </div>
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {t('copyright')}
          </p>
          <nav className="flex flex-wrap justify-center gap-6">
            {links.map(({ href, label, external }) =>
              external ? (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label === t('bugReport') ? <Bug className="size-3.5" /> : null}
                  {label === t('featureRequest') ? <Lightbulb className="size-3.5" /> : null}
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ),
            )}
          </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
