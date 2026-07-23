'use client';

import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ReportSectionContent, ReportSectionId } from '../types/report-types';
import { cn } from '@repo/ui/lib/utils';

type ReportSectionListProps = {
  sections: ReportSectionContent[];
  appendix: ReportSectionContent[];
  activeSectionId: ReportSectionId | null;
  onSelect: (id: ReportSectionId) => void;
  onReorder: (orderedIds: ReportSectionId[]) => void;
};

export function ReportSectionList({
  sections,
  appendix,
  activeSectionId,
  onSelect,
  onReorder,
}: ReportSectionListProps) {
  const t = useTranslations('reportEngine');
  const allSections = [...sections, ...appendix];

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData('text/plain', String(index));
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return;

    const mainIds = sections.map((s) => s.id);
    const [moved] = mainIds.splice(dragIndex, 1);
    if (!moved) return;
    mainIds.splice(dropIndex, 0, moved);
    onReorder(mainIds);
  }

  return (
    <nav className="space-y-1">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('preview.sectionList')}
      </p>
      {allSections.map((section, index) => {
        const isAppendix = section.id === 'APPENDIX';
        const dragIndex = isAppendix ? -1 : index;

        return (
          <button
            key={section.id}
            type="button"
            draggable={!isAppendix}
            onDragStart={(e) => !isAppendix && handleDragStart(e, dragIndex)}
            onDragOver={(e) => !isAppendix && e.preventDefault()}
            onDrop={(e) => !isAppendix && handleDrop(e, dragIndex)}
            onClick={() => onSelect(section.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
              activeSectionId === section.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted/60 text-foreground/80',
            )}
          >
            {!isAppendix ? (
              <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" />
            ) : (
              <span className="w-3.5" />
            )}
            <span className="truncate">{t(section.titleKey as 'sections.executiveSummary')}</span>
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {section.order}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
