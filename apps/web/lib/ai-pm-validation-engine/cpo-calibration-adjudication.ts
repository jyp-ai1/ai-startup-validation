import type { CalibrationClusterCode } from './cpo-improvement-calibration-pack';
import type { CalibrationTurnReplay } from './calibration-turn-replay';

export type CalibrationClass = 'AI_PM_DEFECT' | 'EVALUATOR_DEFECT' | 'GROUND_TRUTH_DEFECT';

export type CpoCalibratedVerdict = 'PASS' | 'PARTIAL' | 'FAIL';

export type AdjudicationResult = {
  cpoCalibratedVerdict: CpoCalibratedVerdict;
  calibrationClass: CalibrationClass;
  cpoRationale: string;
  confirmedForFix: boolean;
};

export function adjudicateCalibrationCase(input: {
  cluster: CalibrationClusterCode;
  replay: CalibrationTurnReplay;
  autoFail: boolean;
  failureTypes: string[];
}): AdjudicationResult {
  const { cluster, replay, failureTypes } = input;
  const { actualFacts, userInput, turn, behavior } = replay;

  switch (cluster) {
    case 'F13_MULTI_FACT_LOSS': {
      const factCount = actualFacts.length;
      const multiSlotCue =
        /구매|사용|엑셀|매일|팀|대표|경영|payer|buyer/.test(userInput) &&
        userInput.split(/[,·하고며]/).length >= 2;
      if (multiSlotCue && factCount < 2) {
        return {
          cpoCalibratedVerdict: 'FAIL',
          calibrationClass: 'AI_PM_DEFECT',
          cpoRationale: `Multi-fact utterance but only ${factCount} extracted fact(s); slots not separated.`,
          confirmedForFix: true,
        };
      }
      if (factCount >= 2 && failureTypes.includes('F13_MULTI_FACT_LOSS')) {
        return {
          cpoCalibratedVerdict: 'PASS',
          calibrationClass: 'EVALUATOR_DEFECT',
          cpoRationale: 'Multiple facts extracted; auto F13 FAIL is not justified.',
          confirmedForFix: false,
        };
      }
      return {
        cpoCalibratedVerdict: factCount >= 2 ? 'PASS' : 'PARTIAL',
        calibrationClass: factCount >= 2 ? 'EVALUATOR_DEFECT' : 'AI_PM_DEFECT',
        cpoRationale: 'Review extraction count vs utterance structure.',
        confirmedForFix: factCount < 2,
      };
    }

    case 'F11_CONTRADICTION_MISHANDLING': {
      const conflictGap = replay.actualGaps.customerPersona === 'CONFLICT';
      if (behavior === 'contradiction' && turn >= 4 && !conflictGap) {
        return {
          cpoCalibratedVerdict: 'FAIL',
          calibrationClass: 'AI_PM_DEFECT',
          cpoRationale: 'Contradiction turn without customerPersona CONFLICT state.',
          confirmedForFix: true,
        };
      }
      if (conflictGap && failureTypes.includes('F11_CONTRADICTION_MISHANDLING')) {
        return {
          cpoCalibratedVerdict: 'PASS',
          calibrationClass: 'EVALUATOR_DEFECT',
          cpoRationale: 'CONFLICT present; auto contradiction FAIL inconsistent.',
          confirmedForFix: false,
        };
      }
      return {
        cpoCalibratedVerdict: conflictGap ? 'PASS' : 'FAIL',
        calibrationClass: conflictGap ? 'EVALUATOR_DEFECT' : 'AI_PM_DEFECT',
        cpoRationale: 'Contradiction handling vs CONFLICT gap.',
        confirmedForFix: !conflictGap,
      };
    }

    case 'STATE_DRIFT': {
      const gtKeys = Object.keys(replay.expectedState);
      let gtMismatch = false;
      for (const k of gtKeys) {
        const gt = replay.expectedState[k];
        const ai = replay.actualState[k];
        if (gt === 'CONFLICT' && ai && ai !== 'CONFLICT' && ai !== 'OPEN') gtMismatch = true;
        if (gt === 'ASSUMPTION' && ai === 'CLOSED') gtMismatch = true;
      }
      if (!gtMismatch && failureTypes.includes('STATE_DRIFT')) {
        return {
          cpoCalibratedVerdict: 'PASS',
          calibrationClass: 'GROUND_TRUTH_DEFECT',
          cpoRationale:
            'Sandbox GT transition oversimplifies V3 gap model; AI state plausible — drift flag is GT/evaluator.',
          confirmedForFix: false,
        };
      }
      if (gtMismatch) {
        return {
          cpoCalibratedVerdict: 'FAIL',
          calibrationClass: 'AI_PM_DEFECT',
          cpoRationale: 'AI gap state diverges from business-meaningful expectation (assumption closed as FACT).',
          confirmedForFix: true,
        };
      }
      return {
        cpoCalibratedVerdict: 'PARTIAL',
        calibrationClass: 'GROUND_TRUTH_DEFECT',
        cpoRationale: 'GT engine alignment with V3 gaps needs refinement before blaming AI PM.',
        confirmedForFix: false,
      };
    }

    case 'F04_FACT_ASSUMPTION_CONFUSION': {
      const weak = /불확실|아마|같|검증|예상/.test(userInput);
      const factOverreach = actualFacts.some(
        (f) => f.evidenceClass === 'FACT' && /wtp|pricing|revenue|buyer|payer/i.test(String(f.key)),
      );
      if (weak && factOverreach) {
        return {
          cpoCalibratedVerdict: 'FAIL',
          calibrationClass: 'AI_PM_DEFECT',
          cpoRationale: 'Uncertainty language but WTP/pricing stored as FACT.',
          confirmedForFix: true,
        };
      }
      if (weak && !factOverreach && input.autoFail) {
        return {
          cpoCalibratedVerdict: 'PASS',
          calibrationClass: 'EVALUATOR_DEFECT',
          cpoRationale: 'Evidence classes respect uncertainty; auto FAIL not warranted.',
          confirmedForFix: false,
        };
      }
      return {
        cpoCalibratedVerdict: weak ? 'PARTIAL' : 'PASS',
        calibrationClass: weak && !factOverreach ? 'EVALUATOR_DEFECT' : 'AI_PM_DEFECT',
        cpoRationale: 'Fact vs assumption boundary for WTP/pricing claims.',
        confirmedForFix: weak && factOverreach,
      };
    }

    case 'F08_WRONG_GAP_PRIORITY': {
      const expected = replay.expectedPriorityGap;
      const actual = replay.actualNextTargetGap;
      if (expected && actual && expected === actual) {
        return {
          cpoCalibratedVerdict: 'PASS',
          calibrationClass: 'EVALUATOR_DEFECT',
          cpoRationale: 'Next question targets highest-priority open gap; intent/priority aligned.',
          confirmedForFix: false,
        };
      }
      if (expected && actual && expected !== actual) {
        const expIntent = replay.expectedQuestionIntent;
        const actIntent = replay.actualQuestionIntent;
        if (expIntent === actIntent && expIntent !== 'unknown') {
          return {
            cpoCalibratedVerdict: 'PARTIAL',
            calibrationClass: 'EVALUATOR_DEFECT',
            cpoRationale: 'Gap id differs but intent family matches — wording/priority rule too strict.',
            confirmedForFix: false,
          };
        }
        return {
          cpoCalibratedVerdict: 'FAIL',
          calibrationClass: 'AI_PM_DEFECT',
          cpoRationale: `Priority gap ${expected} open but next question targets ${actual}.`,
          confirmedForFix: true,
        };
      }
      return {
        cpoCalibratedVerdict: 'PARTIAL',
        calibrationClass: 'EVALUATOR_DEFECT',
        cpoRationale: 'Insufficient gap context for priority judgment.',
        confirmedForFix: false,
      };
    }

    default:
      return {
        cpoCalibratedVerdict: 'PARTIAL',
        calibrationClass: 'EVALUATOR_DEFECT',
        cpoRationale: 'Unhandled cluster.',
        confirmedForFix: false,
      };
  }
}
