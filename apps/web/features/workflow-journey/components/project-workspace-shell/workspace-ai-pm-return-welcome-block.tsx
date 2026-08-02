'use client';

import type { AiPmReturnWelcome } from '../../lib/business-understanding/build-ai-pm-business-clarity';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceAiPmReturnWelcomeBlockProps = {
  welcome: AiPmReturnWelcome;
  className?: string;
};

export function WorkspaceAiPmReturnWelcomeBlock({
  welcome,
  className,
}: WorkspaceAiPmReturnWelcomeBlockProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[15px] font-semibold leading-relaxed">{welcome.greeting}</p>
      <p className="mt-3 text-[15px] leading-relaxed">{welcome.recapLead}</p>
      <p className="mt-2 text-[15px] font-medium leading-relaxed">{welcome.clarityLead}</p>
      <p className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-[15px] font-semibold leading-relaxed">
        {welcome.businessClarity.currentSummary}
      </p>
      <p className="mt-4 text-[15px] leading-relaxed">{welcome.partnerInvite}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        위 헤더의 현재 사업을 기준으로 이어갑니다.
      </p>
    </section>
  );
}
