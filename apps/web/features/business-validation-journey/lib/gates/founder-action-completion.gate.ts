import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const record = path.resolve(
  __dirname,
  '../../../../../../experiments/business-judgment-poc/founder-execution.json',
);

describe('founder action completion gate', () => {
  it('does not record a completed founder experiment', () => {
    expect(existsSync(record)).toBe(false);
  });
});
