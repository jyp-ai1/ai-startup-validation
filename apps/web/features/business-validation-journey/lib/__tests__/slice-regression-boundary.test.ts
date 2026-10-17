import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getResearchProvider } from '@/features/agents/research/providers';

const webRoot = path.resolve(__dirname, '../../../..');

function source(relativePath: string): string {
  return readFileSync(path.join(webRoot, relativePath), 'utf8');
}

describe('comparison route slice boundary', () => {
  it('keeps the openai provider on the same object as gemini', () => {
    expect(getResearchProvider('openai')).toBe(getResearchProvider('gemini'));
    expect(getResearchProvider('openai').id).toBe('gemini');
  });

  it('leaves same-gap question yield out of decideNextQuestionFromReview', () => {
    const src = source(
      'features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts',
    );
    expect(src.includes('maskGapClosed')).toBe(false);
    expect(src.includes('yieldedFrom')).toBe(false);
  });

  it('keeps the non-demo workspace behind login', () => {
    const layout = source('app/[locale]/(shell)/workspace/layout.tsx');
    const page = source('app/[locale]/(shell)/workspace/page.tsx');
    expect(layout.includes('requireAuthUser')).toBe(true);
    expect(page.includes("demoMode={demoMode}")).toBe(true);
    expect(page.includes("? 'demo-guided'")).toBe(true);
  });

  it('keeps the paste comparison off the research provider map', () => {
    const files = [
      'app/[locale]/(public)/business-validation/page.tsx',
      'features/business-validation-journey/components/validation-journey-screen.tsx',
      'features/business-validation-journey/components/web-review-panel.tsx',
      'features/business-validation-journey/lib/web-review-comparison.ts',
      'features/business-validation-journey/lib/stored-model-judgment.ts',
      'app/[locale]/(public)/validation-bench/page.tsx',
      'features/manual-validation-bench/components/validation-bench-screen.tsx',
      'features/manual-validation-bench/lib/validation-bench.ts',
    ];
    for (const file of files) {
      const src = source(file);
      expect(src.includes('getResearchProvider')).toBe(false);
      expect(src.includes('openai-counter-review-provider')).toBe(false);
      expect(src.includes('OpenRouterResearchProvider')).toBe(false);
    }
  });

  it('publishes the full validation journey, including the comparison panel', () => {
    const page = source('app/[locale]/(public)/business-validation/page.tsx');
    const screen = source(
      'features/business-validation-journey/components/validation-journey-screen.tsx',
    );
    expect(page.includes('ValidationJourneyScreen')).toBe(true);
    expect(page.includes('내 사업 이해하기')).toBe(true);
    expect(screen.includes('WebReviewPanel')).toBe(true);
    expect(screen.includes('startJourney')).toBe(true);
    expect(screen.includes('stored-model-judgment')).toBe(false);
    expect(screen.includes('judgeStoredModelOutput')).toBe(false);
  });
});
