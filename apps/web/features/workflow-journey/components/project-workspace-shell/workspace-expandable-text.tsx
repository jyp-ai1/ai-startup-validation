'use client';

import { useState } from 'react';

import { cn } from '@repo/ui/lib/utils';

type WorkspaceExpandableTextProps = {
  text: string;
  preview?: string;
  toggleLabel?: string;
  hideLabel?: string;
  testId?: string;
  className?: string;
};

export function WorkspaceExpandableText({
  text,
  preview,
  toggleLabel = '전체 사업내용 보기',
  hideLabel = '접기',
  testId = 'expandable-business-text',
  className,
}: WorkspaceExpandableTextProps) {
  const [open, setOpen] = useState(false);
  const full = text.trim();
  const shown = preview?.trim() || full;
  const needsExpand = full.length > 0 && full !== shown;

  return (
    <div data-testid={testId} className={cn('min-w-0', className)}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {open || !needsExpand ? full : shown}
      </p>
      {needsExpand ? (
        <button
          type="button"
          data-testid={`${testId}-toggle`}
          className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? hideLabel : toggleLabel}
        </button>
      ) : full.length > 120 ? (
        <button
          type="button"
          data-testid={`${testId}-toggle`}
          className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? hideLabel : toggleLabel}
        </button>
      ) : null}
    </div>
  );
}
