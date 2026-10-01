import { describe, expect, it } from 'vitest';

import { getDemoSeedBundle } from '@/lib/demo/seed';
import { demoSeedQaSteps } from '@/lib/demo/demo-seed-qa';

const SLUGS = ['clinicflow', 'local-sns', 'fitbridge'] as const;

describe('Long Sprint B — demo seed narrative consistency', () => {
  for (const slug of SLUGS) {
    it(`${slug}: business context aligns with document and QA`, () => {
      const bundle = getDemoSeedBundle(slug);
      expect(bundle).not.toBeNull();
      const { business, document } = bundle!;
      const doc = document.body;
      const qa = demoSeedQaSteps(slug);

      expect(doc).toContain(business.businessName.slice(0, 4));
      expect(doc.toLowerCase()).toContain(business.customer.slice(0, 6).toLowerCase().split(' ')[0]!);

      const customerAnswer = qa.find((s) => s.targetGap === 'customerPersona')!.answer;
      expect(customerAnswer.length).toBeGreaterThan(12);
      expect(customerAnswer).not.toMatch(/일반 소비자|MZ 관광객/);

      const problemAnswer = qa.find((s) => s.targetGap === 'problemJtbd')!.answer;
      expect(problemAnswer.length).toBeGreaterThan(10);
      expect(problemAnswer).not.toContain('스마트PM');
    });
  }
});
