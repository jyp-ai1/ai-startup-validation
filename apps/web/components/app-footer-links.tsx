'use client';

import Link from 'next/link';
import { Bug, Lightbulb, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { BETA_VERSION, SITE_LINKS } from '@/lib/site/beta-config';

type AppFooterLinksProps = {
  appName: string;
  tagline: string;
};

export function AppFooterLinks({ appName, tagline }: AppFooterLinksProps) {
  const t = useTranslations('shell.footer');
  const { trackEvent } = useAnalytics();

  function trackExternal(href: string, label: string) {
    trackEvent(ANALYTICS_EVENTS.feedbackClick, { screen: 'app-footer', link: label, target: href });
  }

  return (
    <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <p className="text-muted-foreground">
        © {new Date().getFullYear()} {appName} · {tagline} · {BETA_VERSION}
      </p>
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <a
          href={SITE_LINKS.bugReport}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
          onClick={() => trackExternal(SITE_LINKS.bugReport, 'bug')}
        >
          <Bug className="size-3.5" />
          {t('bugReport')}
        </a>
        <a
          href={SITE_LINKS.featureRequest}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
          onClick={() => trackExternal(SITE_LINKS.featureRequest, 'idea')}
        >
          <Lightbulb className="size-3.5" />
          {t('featureRequest')}
        </a>
        <a
          href={`mailto:${SITE_LINKS.email}`}
          className="inline-flex items-center gap-1.5 hover:text-foreground"
          onClick={() => trackExternal(`mailto:${SITE_LINKS.email}`, 'email')}
        >
          <Mail className="size-3.5" />
          {t('contact')}
        </a>
        {SITE_LINKS.discord ? (
          <a
            href={SITE_LINKS.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
            onClick={() => trackExternal(SITE_LINKS.discord, 'discord')}
          >
            {t('discord')}
          </a>
        ) : null}
        <a
          href={SITE_LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
          onClick={() => trackExternal(SITE_LINKS.github, 'github')}
        >
          GitHub
        </a>
        <Link href="/about" className="hover:text-foreground">
          {t('about')}
        </Link>
      </nav>
    </div>
  );
}
