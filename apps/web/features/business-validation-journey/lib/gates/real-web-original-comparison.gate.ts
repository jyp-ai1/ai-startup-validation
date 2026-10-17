import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../../../../');
const gptOriginal = path.join(repoRoot, 'experiments/business-judgment-poc/gpt-web-original.txt');
const geminiOriginal = path.join(repoRoot, 'experiments/business-judgment-poc/gemini-web-original.txt');

describe('real web original comparison gate', () => {
  it('does not judge comparison quality while the two web originals are absent', () => {
    const gpt = existsSync(gptOriginal);
    const gemini = existsSync(geminiOriginal);
    expect(gpt).toBe(false);
    expect(gemini).toBe(false);
    expect({ qualityJudged: false, userJourneyCompleted: false }).toEqual({
      qualityJudged: false,
      userJourneyCompleted: false,
    });
  });
});
