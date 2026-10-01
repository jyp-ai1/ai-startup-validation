import { describe, expect, it } from 'vitest';

import {
  demoMyBusinessProjectId,
  demoSampleProjectId,
  normalizeDemoSampleSlug,
  resolveDemoGuidedProjectId,
} from '@/lib/demo/demo-isolation';
import { getDemoSample } from '@/features/workflow-journey/lib/demo-samples';
import { isSmartPmSampleDocument } from '@/features/workflow-journey/lib/demo-guided-document-hydration';
import { CLINICFLOW_DOCUMENT, LOCAL_SNS_DOCUMENT } from '@/lib/demo/demo-seed-documents';

describe('Gate 1 — demo state isolation', () => {
  it('uses distinct project ids for Sample A vs Sample B vs My Business', () => {
    const a = demoSampleProjectId('clinicflow');
    const b = demoSampleProjectId('local-sns');
    const mb = demoMyBusinessProjectId('session-a');
    expect(a).not.toBe(b);
    expect(a).not.toBe(mb);
    expect(b).not.toBe(mb);
  });

  it('maps legacy sample query params to seeded slugs', () => {
    expect(normalizeDemoSampleSlug('saas')).toBe('clinicflow');
    expect(normalizeDemoSampleSlug('fnb')).toBe('local-sns');
    expect(normalizeDemoSampleSlug('commerce')).toBe('fitbridge');
  });

  it('seeded samples do not contain SmartPM literal', () => {
    for (const id of ['clinicflow', 'local-sns', 'fitbridge'] as const) {
      const doc = getDemoSample(id).document;
      expect(isSmartPmSampleDocument(doc)).toBe(false);
    }
  });

  it('clinicflow and local-sns documents are distinct rich corpora', () => {
    expect(CLINICFLOW_DOCUMENT).not.toContain('동네장터알림');
    expect(LOCAL_SNS_DOCUMENT).not.toContain('클리닉플로우');
    expect(CLINICFLOW_DOCUMENT.length).toBeGreaterThan(700);
    expect(LOCAL_SNS_DOCUMENT.length).toBeGreaterThan(700);
  });

  it('resolveDemoGuidedProjectId separates custom My Business sessions', () => {
    const sample = resolveDemoGuidedProjectId({ sampleParam: 'clinicflow' });
    const custom = resolveDemoGuidedProjectId({
      sampleParam: 'custom',
      myBusinessSessionId: 'test-session-1',
    });
    expect(sample.startsWith('demo-sample-')).toBe(true);
    expect(custom).toBe('demo-my-test-session-1');
  });
});
