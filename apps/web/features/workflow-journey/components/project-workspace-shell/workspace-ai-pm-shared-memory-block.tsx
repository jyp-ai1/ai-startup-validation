'use client';

import type { AiPmSharedMemory } from '../../lib/business-understanding/build-ai-pm-shared-memory';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceAiPmSharedMemoryBlockProps = {
  memory: AiPmSharedMemory;
  className?: string;
};

export function WorkspaceAiPmSharedMemoryBlock({
  memory,
  className,
}: WorkspaceAiPmSharedMemoryBlockProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-5 py-4 sm:px-6',
        className,
      )}
    >
      <p className="text-[15px] font-semibold leading-relaxed">{memory.lead}</p>
      <ul className="mt-3 space-y-2">
        {memory.items.map((item) => (
          <li key={`${item.label}-${item.value ?? ''}`} className="flex gap-2 text-sm leading-relaxed">
            <span className="shrink-0 font-semibold text-emerald-700" aria-hidden>
              ✓
            </span>
            <span>
              <span className="font-medium">{item.label}</span>
              {item.value ? (
                <span className="text-muted-foreground">{` — ${item.value}`}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-medium text-foreground">{memory.nextStep}</p>
    </section>
  );
}
