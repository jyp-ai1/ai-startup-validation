import { describe, expect, it } from 'vitest';

import {
  buildPartnerContinuousBridge,
  buildPartnerNextStep,
  buildPartnerQuestionLead,
  buildPartnerReturnInvite,
  buildPartnerThinkingBridge,
} from '../build-ai-pm-partner-voice';

describe('build-ai-pm-partner-voice', () => {
  it('builds partner next step for header (companion, not instruction)', () => {
    const partner = buildPartnerNextStep('problem_definition', 1);

    expect(partner?.recap).toBe('여기까지는 우리가 정리했습니다.');
    expect(partner?.insight).toContain('불편한 이유');
    expect(partner?.insight).toContain('선명해질');
    expect(partner?.invite).toBe('같이 확인해 볼까요?');
  });

  it('uses softer first-turn recap before any loop turn', () => {
    const partner = buildPartnerNextStep('customer_definition', 0);
    expect(partner?.recap).toContain('윤곽');
  });

  it('does not claim document read when body is unreadable', () => {
    const partner = buildPartnerNextStep('customer_definition', 0, false);
    expect(partner?.recap).toContain('파일명만');
    expect(partner?.recap).not.toContain('읽었습니다');
  });

  it('builds thinking bridge as invitation', () => {
    expect(buildPartnerThinkingBridge('customer_definition')).toContain('한 뼘 더 선명해질');
    expect(buildPartnerContinuousBridge('problem_definition')).toContain('문제만 같이');
  });

  it('connects questions without sounding like a checklist', () => {
    expect(buildPartnerQuestionLead('problem_definition')).toContain('같이');
    expect(buildPartnerReturnInvite('problem_definition')).toContain('같이 확인해 볼까요?');
  });
});
