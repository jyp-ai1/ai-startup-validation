import { describe, expect, it } from 'vitest';

import { buildWorkspacePersistedFacts } from '../build-workspace-ai-pm-state';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

describe('build-workspace-ai-pm-state — S7-1 Trust Contract', () => {
  it('does not mark ai_read completed for placeholder after trust continue', () => {
    const loop = {
      ...createInitialAiPmLoopState(),
      readingCompleted: true,
      dismissedReadAck: true,
    };

    const facts = buildWorkspacePersistedFacts({
      documentText: PDF_PLACEHOLDER,
      loop,
    });

    expect(facts?.completedSteps).toContain('intake');
    expect(facts?.completedSteps).not.toContain('ai_read');
    expect(facts?.history).not.toContain('ai_read_completed');
  });
});
