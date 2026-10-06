import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  analyzeStrategicIntelligence,
  judgmentContainsScore,
} from '../analyze-strategic-intelligence';

const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);

describe('analyzeStrategicIntelligence — contract', () => {
  it('does not special-case calibration brand names', () => {
    expect(ANALYZER_SRC).not.toMatch(/주인집|LMULM|RIDM|ridm\.ai|교보|오로라/i);
  });

  it('returns insufficient basis on empty input', () => {
    const judgment = analyzeStrategicIntelligence({ documentText: '' });
    expect(judgment.verdictId).toBe('insufficient_basis');
    expect(judgment.stageId).toBe('S0');
    expect(judgment.source).toBe('si-v1');
    expect(judgment.version).toBe(1);
    expect(judgmentContainsScore(judgment.judgment)).toBe(false);
  });

  it('never emits a score-first sentence', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: '카페 구독 사업. 단골 30명이 월 구독료를 내고 재구매한다. 앱을 출시했다.',
    });
    expect(judgmentContainsScore(judgment.judgment)).toBe(false);
    expect(judgment.judgment.startsWith('현재 판단:')).toBe(true);
  });

  it('classifies evidence and keeps one validation priority', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: `소형 카페가 단골 확보에 어려움을 겪는다.
자체 앱을 출시했고 월 구독 매출이 있다.
재구매가 두 달 연속 발생했다.
기존 대안은 쿠폰북과 배달앱이다.`,
    });
    const classes = new Set(judgment.evidenceMap.map((item) => item.evidenceClass));
    expect(classes.size).toBeGreaterThan(0);
    expect(judgment.validationPriority.length).toBeGreaterThan(8);
    expect(judgment.criticalUnknown.length).toBeGreaterThan(8);
    expect(judgment.decisionChangingEvidence.length).toBeGreaterThan(8);
    expect(judgment.axes).toHaveLength(5);
  });
});
