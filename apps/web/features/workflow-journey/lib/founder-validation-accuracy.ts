import { loadProjectRegistration } from '../components/project-registration-panel';
import { loadFounderInformation, type FounderInformationField } from './founder-information-store';
import { loadFounderMicroAnswers } from './founder-micro-interaction-store';
import type { BusinessProgressDimension } from './founder-intelligence-engine';

export type ValidationInfoGap = {
  key: FounderInformationField;
  filled: boolean;
  boost: number;
};

export type ValidationAccuracyBrief = {
  accuracy: number;
  maxAccuracy: number;
  gaps: ValidationInfoGap[];
  filledCount: number;
};

const FIELD_BOOST: Record<FounderInformationField, number> = {
  problem: 15,
  customer: 12,
  mvp: 10,
  progress: 8,
  advantage: 10,
  pricing: 12,
};

const BASE_ACCURACY = 27;

function isProblemFilled(ideaOneLiner: string, info: ReturnType<typeof loadFounderInformation>): boolean {
  if (info.problem?.trim()) return true;
  return ideaOneLiner.trim().length >= 24;
}

function isCustomerFilled(
  info: ReturnType<typeof loadFounderInformation>,
  micro: ReturnType<typeof loadFounderMicroAnswers>,
): boolean {
  if (info.customer?.trim()) return true;
  return Boolean(micro.targetCustomer && micro.targetCustomer !== 'unknown');
}

function isMvpFilled(
  info: ReturnType<typeof loadFounderInformation>,
  micro: ReturnType<typeof loadFounderMicroAnswers>,
): boolean {
  if (info.mvp?.trim()) return true;
  return Boolean(micro.hasMvp);
}

export function computeValidationAccuracy(): ValidationAccuracyBrief {
  const registration = loadProjectRegistration();
  const info = loadFounderInformation();
  const micro = loadFounderMicroAnswers();
  const idea = registration?.ideaOneLiner ?? '';

  const filledMap: Record<FounderInformationField, boolean> = {
    problem: isProblemFilled(idea, info),
    customer: isCustomerFilled(info, micro),
    mvp: isMvpFilled(info, micro),
    progress: Boolean(info.progress?.trim()),
    advantage: Boolean(info.advantage?.trim()),
    pricing: Boolean(info.pricing?.trim()),
  };

  const gaps: ValidationInfoGap[] = (Object.keys(FIELD_BOOST) as FounderInformationField[]).map(
    (key) => ({
      key,
      filled: filledMap[key],
      boost: FIELD_BOOST[key],
    }),
  );

  const filledBoost = gaps.filter((gap) => gap.filled).reduce((sum, gap) => sum + gap.boost, 0);
  const accuracy = Math.min(98, BASE_ACCURACY + filledBoost);
  const maxAccuracy = Math.min(98, BASE_ACCURACY + gaps.reduce((sum, gap) => sum + gap.boost, 0));

  return {
    accuracy,
    maxAccuracy,
    gaps,
    filledCount: gaps.filter((gap) => gap.filled).length,
  };
}

export type CompetitiveGapDimension = {
  key: 'market' | 'competition' | 'differentiation' | 'pricing' | 'branding';
  percent: number;
};

export function buildCompetitiveGapMap(
  businessProgress: BusinessProgressDimension[],
): CompetitiveGapDimension[] {
  const byKey = Object.fromEntries(businessProgress.map((d) => [d.key, d.percent])) as Record<
    string,
    number
  >;

  const market = byKey.market ?? 35;
  const customer = byKey.customer ?? 25;
  const pricing = byKey.pricing ?? 20;
  const investment = byKey.investment ?? 15;

  return [
    { key: 'market', percent: market },
    { key: 'competition', percent: Math.min(95, market + 12) },
    { key: 'differentiation', percent: Math.max(15, Math.round((customer + pricing) / 2 - 10)) },
    { key: 'pricing', percent: pricing },
    { key: 'branding', percent: Math.max(10, investment + 5) },
  ];
}
