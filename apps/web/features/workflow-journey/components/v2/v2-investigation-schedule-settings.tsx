'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  DEFAULT_SCHEDULE_HOUR,
  loadInvestigationScheduleHour,
  loadInvestigationScheduleWeekdaysOnly,
  saveInvestigationScheduleHour,
  saveInvestigationScheduleWeekdaysOnly,
} from '../../lib/v2-investigation-engine';
import type { InvestigationScheduleHour } from '../../lib/v2-investigation-types';

const HOURS: InvestigationScheduleHour[] = ['6', '8', '9'];

type V2InvestigationScheduleSettingsProps = {
  className?: string;
  compact?: boolean;
};

export function V2InvestigationScheduleSettings({
  className,
  compact = false,
}: V2InvestigationScheduleSettingsProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.investigation.schedule');
  const [hour, setHour] = useState<InvestigationScheduleHour>(DEFAULT_SCHEDULE_HOUR);
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);

  useEffect(() => {
    setHour(loadInvestigationScheduleHour());
    setWeekdaysOnly(loadInvestigationScheduleWeekdaysOnly());
  }, []);

  const handleChange = (next: InvestigationScheduleHour) => {
    setHour(next);
    saveInvestigationScheduleHour(next);
  };

  const handleWeekdaysChange = (next: boolean) => {
    setWeekdaysOnly(next);
    saveInvestigationScheduleWeekdaysOnly(next);
  };

  return (
    <div className={cn('rounded-xl border border-border/40 bg-muted/5 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('title')}
      </p>
      {!compact ? <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p> : null}
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">{t('hourLabel')}</legend>
        {HOURS.map((value) => (
          <label
            key={value}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
              hour === value ? 'border-primary/50 bg-primary/5' : 'border-border/60',
            )}
          >
            <input
              type="radio"
              name="investigation-hour"
              value={value}
              checked={hour === value}
              onChange={() => handleChange(value)}
              className="size-4 accent-primary"
            />
            {t(`hours.${value}`)}
          </label>
        ))}
      </fieldset>
      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={weekdaysOnly}
          onChange={(event) => handleWeekdaysChange(event.target.checked)}
          className="size-4 accent-primary"
        />
        {t('weekdaysOnly')}
      </label>
      <p className="mt-3 text-xs text-muted-foreground">
        {t('timezone')}: {t('timezoneValue')}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('autoScan')}</p>
    </div>
  );
}
