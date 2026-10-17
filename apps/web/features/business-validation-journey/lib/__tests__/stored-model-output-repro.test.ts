import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { startJourney } from '../journey-engine';
import { TEST_HYPOTHESIS_INTAKE } from '../journey-types';
import { recordExternalAnalysis } from '../judgment-development';
import { hasLedgerEvidence, judgeStoredModelOutput } from '../stored-model-judgment';

const repoRoot = path.resolve(__dirname, '../../../../../..');
const fixtureDir = path.join(repoRoot, 'experiments/business-judgment-poc');

type StoredOutput = {
  name: string;
  content: string;
  model?: string;
  response_model?: string;
  output_parse: {
    schema_ok: boolean;
    object: {
      Claim: string;
      Fact: boolean;
      Missing_Evidence: string;
      Next_Action: string;
    };
  };
};

function readStored(name: string): StoredOutput {
  return JSON.parse(readFileSync(path.join(fixtureDir, name), 'utf8')) as StoredOutput;
}

function inputSection(prompt: string): string {
  const marker = '\n입력\n';
  const at = prompt.indexOf(marker);
  if (at < 0) throw new Error('prompt has no input section');
  return prompt.slice(at + marker.length);
}

const prompt = readFileSync(path.join(fixtureDir, 'prompt.txt'), 'utf8');
const input = inputSection(prompt);
const path1 = readStored('path1.json');
const path4 = readStored('path4.json');

describe('path1 receipt', () => {
  it('reads the stored gpt-oss-20b output', () => {
    expect(path1.name).toBe('path1-anonymous');
    expect(path1.response_model).toBe('gpt-oss-20b');
    expect(path1.output_parse.schema_ok).toBe(true);
    expect(path1.content.length).toBeGreaterThan(0);
    expect(typeof path1.output_parse.object.Fact).toBe('boolean');
  });
});

describe('path1 expected output', () => {
  it('includes A2', () => {
    const judged = judgeStoredModelOutput({
      sourceText: prompt,
      modelContent: path1.content,
      modelFact: path1.output_parse.object.Fact,
    });
    expect(path1.content.includes('A2')).toBe(false);
    expect(judged.omittedFromModel).toContain('A2');
    expect(judged.output.includes('A2')).toBe(true);
    expect(judged.factStatus).toBe('미확인');
    expect(judged.verifiedFact).toBe(false);
    expect(judged.nextExperiment.hypothesis).toContain('A2:');
    expect(judged.nextExperiment.cost).toBe('미확인');
    expect(judged.nextExperiment.duration).toBe('미확인');
  });

  it('includes the forecast annual revenue', () => {
    const judged = judgeStoredModelOutput({
      sourceText: prompt,
      modelContent: path1.content,
      modelFact: path1.output_parse.object.Fact,
    });
    expect(path1.content.includes('예상 연매출') || path1.content.includes('10억')).toBe(false);
    expect(judged.omittedFromModel).toContain('S3');
    expect(judged.output.includes('예상 연매출') || judged.output.includes('10억')).toBe(true);
  });
});

describe('path1 fact judgment', () => {
  it('keeps Fact false when the input section has no ledger evidence', () => {
    const judged = judgeStoredModelOutput({
      sourceText: prompt,
      modelContent: path1.content,
      modelFact: path1.output_parse.object.Fact,
    });
    expect(hasLedgerEvidence(input)).toBe(false);
    expect(path1.output_parse.object.Fact).toBe(false);
    expect(judged.fact).toBe(false);
    expect(judged.verifiedFact).toBe(false);
  });
});

describe('path4 receipt', () => {
  it('reads the stored qwen2.5:3b output', () => {
    expect(path4.name).toBe('path4-local');
    expect(path4.model).toBe('qwen2.5:3b');
    expect(path4.output_parse.schema_ok).toBe(true);
    expect(path4.content.length).toBeGreaterThan(0);
    expect(typeof path4.output_parse.object.Fact).toBe('boolean');
  });
});

describe('path4 expected output', () => {
  it('includes the A2 dependence sentence', () => {
    expect(path4.content.includes('유지할 수 없다')).toBe(true);
  });

  it('includes the forecast annual revenue', () => {
    const judged = judgeStoredModelOutput({
      sourceText: prompt,
      modelContent: path4.content,
      modelFact: path4.output_parse.object.Fact,
    });
    expect(path4.content.includes('예상 연매출') || path4.content.includes('10억')).toBe(false);
    expect(judged.omittedFromModel).toContain('S3');
    expect(judged.output.includes('예상 연매출') || judged.output.includes('10억')).toBe(true);
  });
});

describe('path4 fact judgment', () => {
  it('keeps Fact false when the input section has no ledger evidence', () => {
    const judged = judgeStoredModelOutput({
      sourceText: prompt,
      modelContent: path4.content,
      modelFact: path4.output_parse.object.Fact,
    });
    expect(hasLedgerEvidence(input)).toBe(false);
    expect(path4.output_parse.object.Fact).toBe(true);
    expect(judged.modelFact).toBe(true);
    expect(judged.fact).toBe(false);
    expect(judged.factStatus).toBe('미확인');
    expect(judged.verifiedFact).toBe(false);
    expect(judged.nextExperiment.hypothesis).toContain('S3:');
    expect(judged.nextExperiment.hypothesis).toContain('모델 Fact true');
    expect(judged.nextExperiment.method).toContain('예상 연매출 10억');
    expect(judged.nextExperiment.hypothesis).not.toBe(String(judged.verifiedFact));
  });
});

describe('recordExternalAnalysis constant', () => {
  it('stores verifiedFact false while the pasted path4 text still says Fact true', () => {
    const started = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
    if (!started.ok) throw new Error('journey did not start');
    const recorded = recordExternalAnalysis(started.state, {
      executionId: 'path4-stored',
      text: path4.content,
      sourceLabel: 'path4.json',
      now: '2026-10-16T07:32:42.275Z',
    });
    expect(path4.output_parse.object.Fact).toBe(true);
    expect(recorded.comparison.verifiedFact).toBe(false);
    expect(recorded.state.externalNotes.at(-1)?.verifiedFact).toBe(false);
    expect(recorded.state.externalNotes.at(-1)?.text).toContain('"Fact": true');
  });
});
