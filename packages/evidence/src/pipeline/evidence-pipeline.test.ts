import { describe, expect, it } from 'vitest';

import {
  assertJudgmentHasEvidence,
  createMockEvidencePipeline,
  EvidenceRequiredError,
  EVIDENCE_SOURCE_PROVIDERS,
} from '../index';

describe('EvidencePipeline', () => {
  it('collects from all mock providers without LLM', async () => {
    const pipeline = createMockEvidencePipeline();
    const result = await pipeline.collect({
      projectId: 'proj-test',
      idea: 'AI founder decision workspace',
    });

    expect(result.evidence.length).toBe(EVIDENCE_SOURCE_PROVIDERS.length);
    expect(result.providers.length).toBe(EVIDENCE_SOURCE_PROVIDERS.length);
    result.evidence.forEach((e) => {
      expect(e.projectId).toBe('proj-test');
      expect(e.summary.length).toBeGreaterThan(0);
    });
  });

  it('interprets stored evidence — never creates new evidence', async () => {
    const pipeline = createMockEvidencePipeline();
    const collected = await pipeline.collect({
      projectId: 'proj-test',
      idea: 'B2B SaaS validation',
    });
    const ids = collected.evidence.map((e) => e.id);

    const interpreted = await pipeline.interpret(ids);
    expect(interpreted.interpretations.length).toBe(ids.length);
    interpreted.interpretations.forEach((i) => {
      expect(ids).toContain(i.evidenceId);
      expect(i.meaning.length).toBeGreaterThan(0);
      expect(i.whyItMatters.length).toBeGreaterThan(0);
    });
  });

  it('rejects judgment without evidence — Rule #1', () => {
    expect(() =>
      assertJudgmentHasEvidence({
        topic: 'market',
        rating: 4,
        summary: 'Market looks good',
        evidenceIds: [],
      }),
    ).toThrow(EvidenceRequiredError);
  });

  it('rejects interpretation without evidence IDs', async () => {
    const pipeline = createMockEvidencePipeline();
    await expect(pipeline.interpret([])).rejects.toThrow(EvidenceRequiredError);
  });
});
