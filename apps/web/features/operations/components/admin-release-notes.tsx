'use client';

import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';

import { BETA_VERSION } from '@/lib/site/beta-config';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

const RELEASE_NOTES = [
  { version: '2.12.0', noteKey: 'v212' },
  { version: '2.11.0', noteKey: 'v211' },
  { version: '2.10.0', noteKey: 'v210' },
] as const;

export function AdminReleaseNotes() {
  const t = useTranslations('operations.adminTools.releaseNotes');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('current')}: <span className="font-medium text-foreground">{BETA_VERSION}</span>
        </p>
        <ul className="space-y-3" role="list">
          {RELEASE_NOTES.map((item) => (
            <li key={item.version} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
              <p className="font-mono text-xs text-muted-foreground">closed-beta-v{item.version}</p>
              <p className="mt-1">{t(`items.${item.noteKey}`)}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
