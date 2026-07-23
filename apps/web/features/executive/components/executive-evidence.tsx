'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ExecutiveEvidenceItem } from '../services/executive-types';
import { formatRelativeTime } from '@repo/utils/date';

type ExecutiveEvidenceProps = {
  evidence: ExecutiveEvidenceItem[];
};

export function ExecutiveEvidence({ evidence }: ExecutiveEvidenceProps) {
  const t = useTranslations('executive');

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t('evidence.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('evidence.desc')}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-semibold">{t('evidence.columns.title')}</th>
              <th className="px-5 py-3 font-semibold">{t('evidence.columns.source')}</th>
              <th className="px-5 py-3 font-semibold">{t('evidence.columns.confidence')}</th>
              <th className="px-5 py-3 font-semibold">{t('evidence.columns.date')}</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((item) => (
              <tr key={item.id} className="border-b border-border/30 last:border-0">
                <td className="px-5 py-4">
                  <Link href={item.href} className="font-medium hover:text-primary hover:underline">
                    {item.title}
                  </Link>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {t(item.sourceKey as 'evidence.source.evidence')}
                </td>
                <td className="px-5 py-4 tabular-nums">{item.confidence}%</td>
                <td className="px-5 py-4 text-muted-foreground">
                  {formatRelativeTime(new Date(item.date))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
