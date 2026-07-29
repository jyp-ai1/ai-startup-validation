type JourneyRedirectStep = {
  from: string;
  to: string;
  reason: string;
  layer: 'middleware' | 'server' | 'client' | 'action';
};

const STEPS: JourneyRedirectStep[] = [];

/** Dev-only redirect chain audit (P0 Product Trust). */
export function logJourneyRedirect(step: Omit<JourneyRedirectStep, 'to'> & { to: string }): void {
  STEPS.push(step);
  if (process.env.NODE_ENV === 'development') {
    console.info('[journey-redirect]', step.layer, step.from, '→', step.to, '|', step.reason);
  }
}

export function getJourneyRedirectAuditTrail(): readonly JourneyRedirectStep[] {
  return STEPS;
}

export function clearJourneyRedirectAudit(): void {
  STEPS.length = 0;
}
