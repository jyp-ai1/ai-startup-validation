import { describe, expect, it } from 'vitest';

import { BRAND_CONFIG } from '../brand-config';

describe('BRAND_CONFIG (ALABOM Concept 3 Progressive Loop)', () => {
  it('locks primary brand and descriptors', () => {
    expect(BRAND_CONFIG.displayName).toBe('ALABOM');
    expect(BRAND_CONFIG.name).toBe('ALABOM');
    expect(BRAND_CONFIG.shortName).toBe('알아봄');
    expect(BRAND_CONFIG.tagline).toBe('사업, 시작하기 전에 알아봄.');
    expect(BRAND_CONFIG.secondaryTagline).toBe('Know Before You Build.');
    expect(BRAND_CONFIG.slogan).toMatch(/one step ahead/i);
    expect(BRAND_CONFIG.themeLine).toMatch(/KNOWN/i);
  });

  it('points logo and favicon at Concept 3 Progressive Loop assets', () => {
    expect(BRAND_CONFIG.logo).toBe('/brand/alabom-mark.svg');
    expect(BRAND_CONFIG.wordmark).toBe('/brand/alabom-wordmark.svg');
    expect(BRAND_CONFIG.favicon).toBe('/icon.svg');
    expect(BRAND_CONFIG.primaryColor).toBe('#F97316');
    expect(BRAND_CONFIG.accentColor).toBe('#F43F5E');
  });
});
