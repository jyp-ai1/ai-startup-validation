import { describe, expect, it } from 'vitest';

import { MINI_SANDBOX_BUSINESSES } from '../mini-sandbox-businesses';
import { runMiniSandboxSession } from '../mini-sandbox-runner';

describe('F11 all mini sandbox businesses', () => {
  it('turn 4 contradiction marks customerPersona CONTRADICTED', () => {
    const failures: string[] = [];
    for (const biz of MINI_SANDBOX_BUSINESSES) {
      const t4 = runMiniSandboxSession({ business: biz, behavior: 'contradiction' }).find(
        (r) => r.turn === 4,
      )!;
      if (t4.aiGapAfter.customerPersona !== 'CONTRADICTED') {
        failures.push(`${biz.id}:${t4.aiGapAfter.customerPersona}`);
      }
    }
    expect(failures, failures.join(', ')).toEqual([]);
  });
});
