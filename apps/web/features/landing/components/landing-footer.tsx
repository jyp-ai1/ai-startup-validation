'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';

export function LandingFooter() {
  const t = useTranslations('landing.footer');

  const links = [
    { href: '/privacy', label: t('privacy') },
    { href: '/terms', label: t('terms') },
    { href: 'mailto:hello@launchlens.ai', label: t('contact') },
    { href: '/version', label: t('version') },
  ];

  return (
    <>
      <section className="py-[120px]">
        <div className="mx-auto max-w-[1440px] px-6 text-center lg:px-10">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-zinc-600">{t('ctaDesc')}</p>
          <LandingCtaLink
            href="/auth/login?next=/dashboard"
            event="cta_start"
            className="mt-10 h-12 rounded-xl bg-zinc-900 px-10 text-white hover:bg-zinc-800"
          >
            {t('ctaButton')}
            <ArrowRight className="size-4" />
          </LandingCtaLink>
        </div>
      </section>

      <footer className="border-t border-black/[0.06] bg-white py-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-6 md:flex-row lg:px-10">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} {t('copyright')}
          </p>
          <nav className="flex flex-wrap justify-center gap-6">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
