import { describe, expect, it } from 'vitest';

import { composeMyBusinessIntakeDocument } from '@/lib/demo/compose-my-business-intake';

describe('composeMyBusinessIntakeDocument', () => {
  it('merges paste and file sections', () => {
    const out = composeMyBusinessIntakeDocument({
      paste: '사업명: 테스트',
      fileText: '고객: B2B',
      fileName: 'plan.pdf',
    });
    expect(out).toContain('사업명: 테스트');
    expect(out).toContain('첨부: plan.pdf');
    expect(out).toContain('고객: B2B');
  });
});
