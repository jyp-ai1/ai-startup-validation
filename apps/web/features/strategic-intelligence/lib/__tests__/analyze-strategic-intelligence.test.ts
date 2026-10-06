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
    expect(ANALYZER_SRC).not.toMatch(/주인집|LMULM|RIDM|ridm\.ai|교보|오로라|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i);
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

  it('does not treat customer-size or problem 매출 as own revenue', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: `연 매출 5~50억 D2C 브랜드는 사이즈 반품률 30%로 마진이 악화됩니다.
매출과 의료진 스케줄이 흔들립니다.
파일럿 5곳에서 no-show 10%p 감소 시 ROI 회수 가설.`,
    });
    expect(judgment.verdictId).not.toBe('viable');
    expect(judgment.stageId).not.toBe('S3');
    expect(judgment.stageId).not.toBe('S4');
    expect(judgment.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED')).toBe(true);
    expect(judgment.strengths.join(' ')).not.toMatch(/실제 판매·매출/);
  });

  it('states why the unknown matters and how evidence would change the judgment', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: `한정판을 실제로 판매했고 1차 판매 매출이 있다. 앱을 출시했다.
C2C 재판매가 반복되는지는 확인되지 않았다.`,
    });
    expect(judgment.criticalUnknown).toMatch(/없으면|없으면/);
    expect(judgment.decisionChangingEvidence).toMatch(/올리면|내린다|유지/);
  });

  it('reads markdown alternative-section body as market evidence', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: `# 사업
문제는 반품률이 높다는 점이다.
## 현재 대안
정적 사이즈 차트와 수동 CS 안내, 자체 추천 위젯.`,
    });
    expect(judgment.axes.find((axis) => axis.axisId === 'marketAlternatives')?.status).not.toBe(
      'unknown',
    );
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
