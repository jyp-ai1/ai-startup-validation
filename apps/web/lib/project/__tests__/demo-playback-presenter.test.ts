import { describe, expect, it } from 'vitest';

import { canonicalPlaybackQuestionForGap } from '@/lib/demo/demo-playback-presenter';
import { demoSeedQaSteps } from '@/lib/demo/demo-seed-qa';

describe('Demo playback presenter', () => {
  it('uses distinct stock questions per Stage A/B gap (no probe repeat)', () => {
    const steps = demoSeedQaSteps('clinicflow');
    const questions = steps.map((s) => canonicalPlaybackQuestionForGap(s.targetGap)).filter(Boolean);
    const unique = new Set(questions);
    expect(unique.size).toBe(questions.length);
    expect(questions.join(' ')).not.toMatch(/조금 더 구체적으로/);
  });
});
