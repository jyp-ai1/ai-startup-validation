import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BRAND_CONFIG } from '../brand-config';

function loadMessages(locale: 'ko' | 'en') {
  const fp = resolve(__dirname, '../../../../../packages/i18n/src/messages', `${locale}.json`);
  let raw = readFileSync(fp, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw) as {
    landing: Record<string, unknown>;
    analytics?: { consent?: Record<string, string> };
  };
}

function collectStrings(value: unknown, path: string, out: Array<{ path: string; value: string }>) {
  if (typeof value === 'string') {
    out.push({ path, value });
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
}

describe('ALABOM Phase 1-A.1 landing brand leakage', () => {
  for (const locale of ['ko', 'en'] as const) {
    it(`${locale}: landing + consent have no LaunchLens / AI Startup Validation`, () => {
      const messages = loadMessages(locale);
      const strings: Array<{ path: string; value: string }> = [];
      collectStrings(messages.landing, 'landing', strings);
      if (messages.analytics?.consent) {
        collectStrings(messages.analytics.consent, 'analytics.consent', strings);
      }

      const leaked = strings.filter(({ value }) =>
        /LaunchLens|AI Startup Validation/i.test(value),
      );

      expect(leaked, leaked.map((l) => `${l.path}: ${l.value}`).join('\n')).toEqual([]);
      expect(messages.landing.meta).toMatchObject({
        title: expect.stringContaining(BRAND_CONFIG.displayName),
      });
    });
  }
});
