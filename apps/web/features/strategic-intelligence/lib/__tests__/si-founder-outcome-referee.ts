/**
 * Independent Founder-outcome referee.
 * Not GPT copy. Not an S.I. source of truth. Not imported by the analyzer.
 *
 * Direction match (PR #99/#100) is a different question:
 * "does S.I. point the same way as GPT/Gemini?"
 * This referee asks: "can a Founder tell what to validate, stop, or focus on?"
 */

import type { SiCalibrationCaseId } from '../si-calibration-cases';

export type FounderOutcomeReferee = {
  id: SiCalibrationCaseId;
  /** One next proof the Founder should run. */
  validatePatterns: RegExp[];
  /** A kill / hold condition — not a feature list. */
  stopPatterns: RegExp[];
  /** The one unknown that should consume attention. */
  focusPatterns: RegExp[];
  /** Tokens a complete answer must include before a viable upgrade is honest. */
  stakeInAnswer?: RegExp;
};

export const FOUNDER_OUTCOME_REFEREE: Record<SiCalibrationCaseId, FounderOutcomeReferee> = {
  juinjip: {
    id: 'juinjip',
    validatePatterns: [/결제|지불|대표/],
    stopPatterns: [/결제자|지불|출시|매출|확인되지/],
    focusPatterns: [/결제자|구매자|돈을 내는/],
  },
  lmulm: {
    id: 'lmulm',
    validatePatterns: [/재판매|재구매|코호트/],
    stopPatterns: [/재판매|브랜드|플랫폼|반복/],
    focusPatterns: [/C2C|재판매|반복/],
    stakeInAnswer: /재판매/,
  },
  ridm: {
    id: 'ridm',
    validatePatterns: [/결제|직무|Job|돈을 내는|대신/],
    stopPatterns: [/직무|결제|콘셉트|확인되지|검증되지/],
    focusPatterns: [/직무|결제|Job|돈을 내는/],
  },
  clinicflow: {
    id: 'clinicflow',
    validatePatterns: [/no-show|노쇼|전후|유료/],
    stopPatterns: [/no-show|노쇼|유료|지표가 그대로|확정할 수 없/],
    focusPatterns: [/no-show|노쇼/],
    stakeInAnswer: /no-show|노쇼/,
  },
  fitbridge: {
    id: 'fitbridge',
    validatePatterns: [/반품|전후|유료/],
    stopPatterns: [/반품|유료|지표가 그대로|확정할 수 없/],
    focusPatterns: [/반품/],
    stakeInAnswer: /반품/,
  },
};
