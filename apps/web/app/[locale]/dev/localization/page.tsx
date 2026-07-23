export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LAUNCH_LOCALES, loadMessages, humanizeMessageKey } from '@repo/i18n';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { PageHeader } from '@repo/ui';

const SAMPLE_KEYS = [
  'landing.hero.title',
  'landing.nav.startFree',
  'landing.pricing.title',
  'landing.faq.title',
  'nav.dashboard',
  'nav.research',
  'nav.decisionReport',
  'common.save',
  'common.language',
  'dashboard.newProject',
  'validation.title',
  'reports.title',
  'decision.title',
  'auth.signIn',
  'meta.appName',
] as const;

function resolve(messages: Record<string, unknown>, dotPath: string): string | undefined {
  const value = dotPath.split('.').reduce<unknown>((cur, part) => {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      return (cur as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);

  return typeof value === 'string' ? value : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dev');
  return { title: t('localizationTitle'), robots: { index: false, follow: false } };
}

export default async function LocalizationTestPage() {
  const t = await getTranslations('dev');
  const [koMessages, enMessages] = await Promise.all([loadMessages('ko'), loadMessages('en')]);

  const rows = SAMPLE_KEYS.map((key) => {
    const ko = resolve(koMessages as Record<string, unknown>, key);
    const en = resolve(enMessages as Record<string, unknown>, key);
    const looksLikeKey = (value?: string) =>
      !value || value.includes('.') || value === key || value === humanizeMessageKey(key);

    return {
      key,
      ko: ko ?? '—',
      en: en ?? '—',
      ok: Boolean(ko && en && !looksLikeKey(ko) && !looksLikeKey(en)),
    };
  });

  const missingCount = rows.filter((row) => !row.ok).length;

  return (
    <>
      <PageHeader
        title={t('localizationTitle')}
        description={t('localizationDesc', { missing: missingCount, total: rows.length })}
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <LocaleSwitcher />
        <p className="text-sm text-muted-foreground">
          Launch locales: {LAUNCH_LOCALES.join(', ')} · Run <code className="text-xs">pnpm audit:i18n</code>
        </p>
      </div>
      <div className="mt-8 overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border/70 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t('table.key')}</th>
              <th className="px-4 py-3">KO</th>
              <th className="px-4 py-3">EN</th>
              <th className="px-4 py-3">{t('table.status')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/50">
                <td className="px-4 py-3 font-mono text-xs">{row.key}</td>
                <td className="px-4 py-3">{row.ko}</td>
                <td className="px-4 py-3">{row.en}</td>
                <td className="px-4 py-3">{row.ok ? t('table.ok') : t('table.missing')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
