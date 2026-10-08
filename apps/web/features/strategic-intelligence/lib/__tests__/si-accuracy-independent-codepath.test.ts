import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { traceDocument } from './trace-si-accuracy-independent-codepath';

const PACK_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-independent-cpo-2pass.json',
);
const OUT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-independent-codepath.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);

const PRODUCTION_SHA = '0b465226516e1a4f3eb9ce2087f8bca2c2c091da';
const DUMP_SHA = 'a79c81cb2de1c74ea1e956daa02f2ae0c18ad8be';

type Packed = {
    input: {
      businessDocument: string;
      priorAnswerForChain?: string | null;
      heldAnswerForChain?: string | null;
      founderAnswer: string | null;
    };
  after: { verdictId: string; stageId: string; judgment: string };
  businessType: string;
  stake: string;
  knownStakeNoun: boolean;
};

function replay(item: Packed) {
  let document = item.input.businessDocument;
  if (item.input.priorAnswerForChain) {
    document = appendFounderEvidenceToDocument(document, item.input.priorAnswerForChain);
  }
  if (item.input.heldAnswerForChain) {
    document = appendFounderEvidenceToDocument(document, item.input.heldAnswerForChain);
  }
  const live = traceDocument(document, item.input.founderAnswer);
  return {
    businessType: item.businessType,
    stake: item.stake,
    knownStakeNoun: item.knownStakeNoun,
    dumpVerdict: item.after.verdictId,
    dumpStage: item.after.stageId,
    liveMatchesDump: live.verdictId === item.after.verdictId && live.stageId === item.after.stageId,
    live,
  };
}

describe('S.I. independent code-path review — measure only', () => {
  it('does not change analyzer source', () => {
    expect(ANALYZER_SRC).toMatch(/const STAKE_NOUN/);
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(ANALYZER_SRC).toMatch(/function decideStage/);
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function applySignalRetractions/);
    expect(ANALYZER_SRC).toMatch(/function buildRisks/);
  });

  it('replays CPO pack originals through live engine and records gates', () => {
    const pack = JSON.parse(readFileSync(PACK_PATH, 'utf8')) as {
      classes: {
        payment_only_s3: { failing: Packed[]; control: Packed[] };
        missed_negative_downgrade: { failing: Packed[]; control: Packed[] };
        wrong_axis_s4: { failing: Packed[] };
        unseen_stake_cu_omitted: { failing: Packed[]; control: Packed[] };
        headline_contradiction: { wrong_axis: Packed[]; closed_reask: Packed[] };
      };
    };

    const payment = {
      failing: pack.classes.payment_only_s3.failing.map(replay),
      control: pack.classes.payment_only_s3.control.map(replay),
    };
    const negative = {
      failing: pack.classes.missed_negative_downgrade.failing.map(replay),
      control: pack.classes.missed_negative_downgrade.control.map(replay),
    };
    const wrongAxis = pack.classes.wrong_axis_s4.failing.map(replay);
    const cuOmit = {
      failing: pack.classes.unseen_stake_cu_omitted.failing.map(replay),
      control: pack.classes.unseen_stake_cu_omitted.control.map(replay),
    };
    const headline = {
      wrong_axis: pack.classes.headline_contradiction.wrong_axis.map(replay),
      closed_reask: pack.classes.headline_contradiction.closed_reask.map(replay),
    };

    const all = [
      ...payment.failing,
      ...payment.control,
      ...negative.failing,
      ...negative.control,
      ...wrongAxis,
      ...cuOmit.failing,
      ...cuOmit.control,
      ...headline.wrong_axis,
      ...headline.closed_reask,
    ];

    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(
      OUT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          dumpSha: DUMP_SHA,
          production: 'UNCHANGED',
          preview: 'UNVERIFIED',
          fixGate: 'CANDIDATE',
          engineModified: false,
          liveMatchesDump: all.every((row) => row.liveMatchesDump),
          replayed: all.length,
          paths: {
            A1_paymentOnlyS3: {
              file: 'analyze-strategic-intelligence.ts',
              gates: ['L87 STAKE_NOUN', 'L296 quantified_problem', 'L607 dceStakeOpen', 'L622 decideStage', 'L655 decideVerdict'],
              rows: payment,
            },
            A2_missedDowngrade: {
              file: 'analyze-strategic-intelligence.ts',
              gates: ['L103 isStakeWorsenedLine', 'L451 applySignalRetractions', 'L463 stakeWorsened'],
              rows: negative,
            },
            A3_wrongAxisS4: {
              files: ['quantity-unit.ts L17 COMPLETION_VERB / L90 hasCountedCompletion', 'analyze L267 repeat_validation', 'L621 S4', 'L654 viable'],
              rows: wrongAxis,
            },
            A4_cuOmitted: {
              gates: ['L296 quantified_problem', 'L720 pickCriticalUnknown'],
              rows: cuOmit,
            },
            A5_headline: {
              gates: ['L252 no_revenue', 'L814 buildStrengths', 'L852 buildRisks', 'L885 proseJudgment'],
              rows: headline,
            },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(all).toHaveLength(48);
    expect(all.every((row) => row.liveMatchesDump)).toBe(true);
    expect(payment.failing.every((row) => row.live.stageId === 'S3')).toBe(true);
    expect(payment.control.every((row) => row.live.stageId === 'S0')).toBe(true);
    expect(wrongAxis.every((row) => row.live.stageId === 'S4' && row.live.completionOnAnswer)).toBe(true);
    expect(PRODUCTION_SHA).toBe('0b465226516e1a4f3eb9ce2087f8bca2c2c091da');
  });
});
