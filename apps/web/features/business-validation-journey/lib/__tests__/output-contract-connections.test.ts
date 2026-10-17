import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { startJourney } from '../journey-engine';
import type { Intake } from '../journey-types';
import { storeWebReview } from '../web-review-comparison';

const webRoot = path.resolve(__dirname, '../../../..');
const componentsDir = path.resolve(__dirname, '../../components');

function source(relativePath: string): string {
  return readFileSync(path.join(webRoot, relativePath), 'utf8');
}

const INTAKE: Intake = {
  business: '모회사 채널과 한정판 판매',
  customer: '한정판 수집가',
  problem: '매출 구성이 문서 주장과 원장으로 나뉘지 않았다',
  solution: '',
  payer: '',
  revenue: '',
  evidence: '',
  url: '',
};

describe('output contract connections', () => {
  it('keeps stored-model judgment off the journey screens', () => {
    const files = readdirSync(componentsDir).filter((name) => name.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(path.join(componentsDir, file), 'utf8');
      expect(src.includes('judgeStoredModelOutput'), file).toBe(false);
      expect(src.includes('stored-model-judgment'), file).toBe(false);
    }
  });

  it('consumes the comparison hold on the panel and does not store fact status', () => {
    const panel = source('features/business-validation-journey/components/web-review-panel.tsx');
    expect(panel.includes('assessFounderExecution')).toBe(true);
    expect(panel.includes("stage: 'before_execution'")).toBe(true);
    expect(panel.includes('사실 검증이 끝났다는 표시가 아니다')).toBe(true);
    expect(panel.includes('미확인에서 옮기지 않는다')).toBe(true);
    expect(panel.includes('저장된 단일 모델 출력의 실험은 이 화면에 없다')).toBe(true);
    expect(panel.includes('readWebReview')).toBe(true);
    expect(panel.includes('storeWebReview')).toBe(true);

    const screen = source(
      'features/business-validation-journey/components/validation-journey-screen.tsx',
    );
    expect(screen.includes('WebReviewPanel')).toBe(true);
    expect(screen.includes('saveJourneyDraft')).toBe(true);
    expect(screen.includes('assessFounderExecution')).toBe(false);
    expect(screen.includes('judgeStoredModelOutput')).toBe(false);

    const started = startJourney(INTAKE, 'test_hypothesis');
    if (!started.ok) throw new Error('start failed');
    const stored = storeWebReview(started.state, {
      slot: 'gpt',
      text: 'S3 예상 연매출 10억은 받은 돈이 아니다.',
      now: '2026-10-17T07:20:00.000Z',
      provenance: 'test_fixture',
    });
    const note = stored.state.externalNotes?.[0];
    expect(note?.verifiedFact).toBe(false);
    expect(note).not.toHaveProperty('factStatus');
    expect(note).not.toHaveProperty('nextExperiment');
  });

  it('keeps fact status off the handoff paste and the session helper', () => {
    const handoff = source('features/business-validation-journey/lib/external-handoff.ts');
    const development = source('features/business-validation-journey/lib/judgment-development.ts');
    const session = source('features/business-validation-journey/lib/journey-session.ts');
    expect(handoff.includes('factStatus')).toBe(false);
    expect(handoff.includes('nextExperiment')).toBe(false);
    expect(handoff.includes('recordExternalAnalysis')).toBe(true);
    expect(development.includes('factStatus')).toBe(false);
    expect(development.includes('nextExperiment')).toBe(false);
    expect(development.includes('verifiedFact: false')).toBe(true);
    expect(session.includes('factStatus')).toBe(false);
    expect(session.includes('JSON.stringify(state)')).toBe(true);
    expect(session.includes('alabom.validationJourney.v1')).toBe(true);
  });
});
