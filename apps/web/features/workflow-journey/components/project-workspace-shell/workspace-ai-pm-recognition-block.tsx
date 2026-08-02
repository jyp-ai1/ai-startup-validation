'use client';

import type { AiPmCompactLines } from '../../lib/business-understanding/build-ai-pm-conversation-rhythm';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceAiPmRecognitionBlockProps = {
  recognition: AiPmCompactLines;
  className?: string;
};

/** S5.2 — Answer → Recognition (three lines, confirm only). */
export function WorkspaceAiPmRecognitionBlock({
  recognition,
  className,
}: WorkspaceAiPmRecognitionBlockProps) {
  const [lead, confirm, next] = recognition.lines;

  return (
    <section
      className={cn(
        'rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[15px] font-semibold leading-relaxed">{lead}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-foreground">{confirm}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{next}</p>
    </section>
  );
}
