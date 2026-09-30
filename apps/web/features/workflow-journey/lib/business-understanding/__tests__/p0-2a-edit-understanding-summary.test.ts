import { describe, expect, it } from 'vitest';

import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { buildEditUnderstandingSummary } from '../build-edit-understanding-summary';
import { emptyWorkspaceDomain } from '../../workspace-ai-pm-messages';
import { applyWorkspaceDomainToMemory } from '../apply-workspace-domain-to-memory';

const BREWERY_DOC = `# 영세 양조장 온라인 홍보 SaaS

사업: 영세 양조장을 위한 B2B SaaS

고객의 니즈는 많으나 그들에게 손쉬운 온라인 홍보플랫폼을 만들어 제공하려 함.

대상: 소규모 양조장`;

describe('P0-2A correction canonical reflect', () => {
  it('edit confirm summary uses domain customer after founder correction', () => {
    const domain = {
      ...emptyWorkspaceDomain(),
      business: '영세 양조장 온라인 홍보 B2B SaaS',
      customer: '소규모 영세 양조장',
    };
    const memory = applyWorkspaceDomainToMemory({
      projectId: 'demo-session',
      domain,
    });

    const summary = buildEditUnderstandingSummary({
      documentText: BREWERY_DOC,
      entities: null,
      loop: createInitialAiPmLoopState(),
      domain,
      memory,
    });

    expect(summary.customer).toContain('양조장');
    expect(summary.customer).not.toBe('아직 확인 중');
    expect(summary.business).toContain('양조장');
  });
});
