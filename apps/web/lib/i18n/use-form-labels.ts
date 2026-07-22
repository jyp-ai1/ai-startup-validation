'use client';

import { useTranslations } from 'next-intl';

/** Shared form action and button labels. */
export function useFormLabels() {
  const t = useTranslations('common');

  return {
    saving: t('saving'),
    saveChanges: t('saveChanges'),
    cancel: t('cancel'),
    cancelEdit: t('cancelEdit'),
    saveSection: t('saveSection'),
    saveReport: t('saveReport'),
    createProject: t('createProject'),
    createVoc: t('createVoc'),
    createGrant: t('createGrant'),
    createResearch: t('createResearch'),
    createEvidence: t('createEvidence'),
    createCompetitor: t('createCompetitor'),
  };
}

/** Translate enum values under `enums.{namespace}`. */
export function useEnumLabel(namespace: string, key: string): string {
  const t = useTranslations(`enums.${namespace}`);
  return t(key);
}
