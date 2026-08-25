import { describe, expect, it } from 'vitest';

import { BRAND_CONFIG } from '../brand-config';

describe('BRAND_CONFIG (ALABOM Phase 1-A)', () => {
  it('locks primary brand and descriptors', () => {
    expect(BRAND_CONFIG.displayName).toBe('ALABOM');
    expect(BRAND_CONFIG.name).toBe('ALABOM');
    expect(BRAND_CONFIG.shortName).toBe('알아봄');
    expect(BRAND_CONFIG.tagline).toBe('사업, 시작하기 전에 알아봄.');
    expect(BRAND_CONFIG.secondaryTagline).toBe('Know Before You Build.');
  });

  it('points logo and favicon at the shared mark', () => {
    expect(BRAND_CONFIG.logo).toBe('/icon.svg');
    expect(BRAND_CONFIG.favicon).toBe('/icon.svg');
  });
});
