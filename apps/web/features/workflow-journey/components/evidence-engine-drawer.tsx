'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileSearch } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui';

import { EvidenceIntelligencePanel } from './evidence-intelligence-panel';

type EvidenceEngineDrawerProps = {
  verdict?: string;
  confidenceValue?: number;
  completedRuleIds?: string[];
  triggerClassName?: string;
};

export function EvidenceEngineDrawer({
  verdict = 'HOLD',
  confidenceValue = 62,
  completedRuleIds = [],
  triggerClassName,
}: EvidenceEngineDrawerProps) {
  const t = useTranslations('workflow.intelligence.drawer');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <FileSearch className="size-4" aria-hidden />
          {t('open')}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-4 py-4">
          <EvidenceIntelligencePanel
            evidenceOpen
            verdict={verdict}
            confidenceValue={confidenceValue}
            completedRuleIds={completedRuleIds}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
