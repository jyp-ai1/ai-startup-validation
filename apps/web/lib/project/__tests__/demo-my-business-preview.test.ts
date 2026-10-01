import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  isDemoMyBusinessPreviewCap,
  shouldBlockDemoMyBusinessJudgment,
  shouldShowDemoMyBusinessPreview,
} from '@/lib/demo/demo-my-business-preview';

vi.mock('@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store', () => ({
  loadAiPmLoopState: vi.fn(),
}));

import { loadAiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store';

const loadLoop = vi.mocked(loadAiPmLoopState);

describe('Long Sprint C — My Business preview cap', () => {
  beforeEach(() => {
    loadLoop.mockReset();
  });

  it('caps only demo-my project ids', () => {
    expect(isDemoMyBusinessPreviewCap('demo-my-abc')).toBe(true);
    expect(isDemoMyBusinessPreviewCap('demo-sample-clinicflow')).toBe(false);
  });

  it('shows preview after reading, before full loop', () => {
    loadLoop.mockReturnValue({
      readingCompleted: true,
      viewMode: 'understanding',
    } as ReturnType<typeof loadAiPmLoopState>);

    expect(shouldShowDemoMyBusinessPreview('demo-my-x', 'pending')).toBe(true);
    expect(shouldShowDemoMyBusinessPreview('demo-my-x', 'review-ready')).toBe(false);
  });

  it('blocks judgment surfaces on My Business demo', () => {
    loadLoop.mockReturnValue({
      readingCompleted: true,
      viewMode: 'judgment',
    } as ReturnType<typeof loadAiPmLoopState>);

    expect(shouldBlockDemoMyBusinessJudgment('demo-my-x')).toBe(true);
    expect(shouldBlockDemoMyBusinessJudgment('demo-sample-clinicflow')).toBe(false);
  });
});
