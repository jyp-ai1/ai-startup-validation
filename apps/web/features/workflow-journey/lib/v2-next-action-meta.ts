import type { NextActionKind } from './v2-next-action-engine';

export type NextActionMeta = {
  priorityStars: number;
  estimatedMinutes: number;
  expectedEffectKey: string;
};

const META: Record<NextActionKind, NextActionMeta> = {
  'fill-idea': {
    priorityStars: 5,
    estimatedMinutes: 5,
    expectedEffectKey: 'fill-idea',
  },
  'start-review': {
    priorityStars: 5,
    estimatedMinutes: 2,
    expectedEffectKey: 'start-review',
  },
  're-review': {
    priorityStars: 5,
    estimatedMinutes: 2,
    expectedEffectKey: 're-review',
  },
  'fill-pricing': {
    priorityStars: 5,
    estimatedMinutes: 3,
    expectedEffectKey: 'fill-pricing',
  },
  'view-investigation': {
    priorityStars: 4,
    estimatedMinutes: 5,
    expectedEffectKey: 'view-investigation',
  },
  'customer-validation': {
    priorityStars: 4,
    estimatedMinutes: 30,
    expectedEffectKey: 'customer-validation',
  },
  'fill-customer': {
    priorityStars: 4,
    estimatedMinutes: 10,
    expectedEffectKey: 'fill-customer',
  },
};

export function getNextActionMeta(kind: NextActionKind): NextActionMeta {
  return META[kind];
}
