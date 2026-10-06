import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import {
  adaptFounderJourneyQuestion,
  resolveSiV1ValidationPriority,
  shouldPreferSiValidationOverGap,
} from '../resolve-si-v1-validation-priority';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const ADAPTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../resolve-si-v1-validation-priority.ts'),
  'utf8',
);

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-priority-adapter.json',
);

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;
const GAP_FALLBACK = {
  targetGapId: 'businessOneLiner',
  questionText: '이 사업은 누구에게 무엇을 제공하나요?',
  whyNow: '한 줄 사업 정의가 비면 이후 질문을 정렬할 기준이 없습니다.',
};

describe('S.I. Validation Priority Adapter', () => {
  it('does not rewrite the question engine or special-case brands', () => {
    expect(ADAPTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(ADAPTER_SRC).not.toMatch(/주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge/i);
  });

  it('falls back to the gap loop when S.I. has no document or throws', () => {
    const none = resolveSiV1ValidationPriority({ documentText: '' });
    expect(none.present).toBe(false);
    const adapted = adaptFounderJourneyQuestion({
      siPriority: none,
      gapQuestionText: GAP_FALLBACK.questionText,
      gapWhyNow: GAP_FALLBACK.whyNow,
    });
    expect(adapted.source).toBe('gap-loop-fallback');
    expect(adapted.questionText).toBe(GAP_FALLBACK.questionText);
    expect(shouldPreferSiValidationOverGap({ siPriority: none, ...GAP_FALLBACK })).toBe(false);
  });

  it('does not steal a business-understanding confirm', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const si = resolveSiV1ValidationPriority({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    expect(
      shouldPreferSiValidationOverGap({
        siPriority: si,
        gapTargetId: 'businessOneLiner',
        gapQuestionText: '제가 이해한 사업은 「한정판」입니다. 맞나요?',
      }),
    ).toBe(false);
  });

  it.each(CASE_IDS)('%s: SI priority wins over businessOneLiner and updates via Phase 2', (id) => {
    const fixture = getSiCalibrationCase(id);
    const si = resolveSiV1ValidationPriority({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    expect(si.present).toBe(true);
    if (!si.present) return;

    const adapted = adaptFounderJourneyQuestion({
      siPriority: si,
      gapQuestionText: GAP_FALLBACK.questionText,
      gapWhyNow: GAP_FALLBACK.whyNow,
    });
    expect(adapted.source).toBe('si-v1-priority');
    expect(adapted.questionText).toBe(si.question.questionText);
    expect(adapted.questionText).not.toBe(GAP_FALLBACK.questionText);
    expect(adapted.questionText).not.toBe(si.ask.criticalUnknown);
    expect(adapted.questionText).toMatch(/습니까|알려주세요/);
    expect(
      shouldPreferSiValidationOverGap({
        siPriority: si,
        gapTargetId: GAP_FALLBACK.targetGapId,
        gapQuestionText: GAP_FALLBACK.questionText,
      }),
    ).toBe(true);

    const answer = pickSiIntegrationAnswer(si.question.kind, 'validated');
    const updated = resolveSiJourneyIntegration({
      title: fixture.title,
      businessDocument: fixture.documentText,
      founderAnswer: answer,
    });
    expect(updated.current.update?.source).toBe('si-v1-update');
    expect(updated.current.update?.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    const next = resolveSiV1ValidationPriority({
      title: fixture.title,
      documentText: fixture.documentText,
      founderAnswer: answer,
    });
    expect(next.present).toBe(true);
    if (next.present) {
      expect(next.question.questionText.length).toBeGreaterThan(8);
    }
  });

  it('writes the five-business adapter dump', () => {
    const rows = CASE_IDS.map((id) => {
      const fixture = getSiCalibrationCase(id);
      const si = resolveSiV1ValidationPriority({
        title: fixture.title,
        documentText: fixture.documentText,
      });
      const adapted = adaptFounderJourneyQuestion({
        siPriority: si,
        gapQuestionText: GAP_FALLBACK.questionText,
        gapWhyNow: GAP_FALLBACK.whyNow,
      });
      return {
        id,
        siKind: si.present ? si.ask.kind : null,
        validationPriority: si.present ? si.ask.validationPriority : null,
        gapQuestion: GAP_FALLBACK.questionText,
        adaptedSource: adapted.source,
        adaptedQuestion: adapted.questionText,
        copiedCriticalUnknown: si.present
          ? adapted.questionText === si.ask.criticalUnknown
          : false,
        preferSi: shouldPreferSiValidationOverGap({
          siPriority: si,
          gapTargetId: GAP_FALLBACK.targetGapId,
          gapQuestionText: GAP_FALLBACK.questionText,
        }),
      };
    });
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    expect(rows.every((row) => row.adaptedSource === 'si-v1-priority' && row.preferSi)).toBe(true);
  });
});
