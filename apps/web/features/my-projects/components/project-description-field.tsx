'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const DESCRIPTION_MAX = 1000;

type ProjectDescriptionFieldProps = {
  disabled?: boolean;
};

export function ProjectDescriptionField({ disabled = false }: ProjectDescriptionFieldProps) {
  const t = useTranslations('myProjects');
  const [value, setValue] = useState('');
  return (
    <div className="space-y-1.5">
      <textarea
        id="project-description"
        name="description"
        rows={5}
        maxLength={DESCRIPTION_MAX}
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, DESCRIPTION_MAX))}
        placeholder={t('descriptionPlaceholder')}
        className="min-h-[7rem] w-full resize-y rounded-xl border border-border/70 bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
        disabled={disabled}
      />
      <p className="text-right text-xs text-muted-foreground">
        {value.length}/{DESCRIPTION_MAX}
      </p>
    </div>
  );
}
