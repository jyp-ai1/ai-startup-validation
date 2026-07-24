/** Daily coach copy — Epic 3 Living Intelligence (mock). */

export type DailyCoachBrief = {
  greeting: string;
  focusAction: string;
  confidenceCurrent: number;
  confidenceAfter: number;
  etaMinutes: number;
  exitSummary: string;
  exitNext: string;
  todayGain: number;
};

export const DAILY_COACH: DailyCoachBrief = {
  greeting: 'morning',
  focusAction: 'voc',
  confidenceCurrent: 62,
  confidenceAfter: 82,
  etaMinutes: 15,
  exitSummary: '8',
  exitNext: 'pricing',
  todayGain: 8,
};
