import { describe, expect, it } from 'vitest';

import {
  buildB2cFounderConfusionMessage,
  buildPdfPlaceholderFirstMessage,
  buildTasteCompanyFirstMessage,
  copyFromMessage,
  expectFirstTrustPass,
} from '../index';

describe('first-trust/b2c-founder', () => {
  it('does not guess customer when only founder archetype appears', () => {
    const message = buildB2cFounderConfusionMessage();
    const copy = copyFromMessage(message);

    expect(copy).toContain('B2C');
    expect(copy).toContain('고객');
    expect(copy).not.toContain('예상 서비스 사용자');
    expect(copy).not.toContain('개인 창업자');
    expectFirstTrustPass(copy);
  });
});

describe('first-trust/customer-unknown', () => {
  it('taste company with document customer shows evidence and next action', () => {
    const message = buildTasteCompanyFirstMessage();
    const copy = copyFromMessage(message);

    expect(copy).toContain('일반인');
    expect(copy).toContain('근거');
    expect(copy).not.toContain('예비창업');
    expectFirstTrustPass(copy);
  });
});

describe('first-trust/pdf-placeholder', () => {
  it('does not overclaim when PDF body is unavailable', () => {
    const message = buildPdfPlaceholderFirstMessage();
    const copy = copyFromMessage(message);

    expect(copy).toContain('확인');
    expect(copy).not.toMatch(/예상|보입니다|아마|가능성/);
    expect(copy).not.toContain('예상 서비스 사용자');
    expect(copy).not.toContain('분석했습니다');
    expectFirstTrustPass(copy);
  });
});
