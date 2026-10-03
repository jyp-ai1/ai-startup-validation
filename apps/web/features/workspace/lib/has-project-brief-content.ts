function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** True when the project has at least one stored AI PM answer — gates the brief entry link. */
export function hasProjectBriefContent(onboardingContext: Record<string, unknown> | null): boolean {
  const workspace = onboardingContext?.v2Workspace;
  if (!isRecord(workspace)) return false;
  const loop = workspace.aiPmLoop;
  if (!isRecord(loop) || !Array.isArray(loop.turns)) return false;
  return loop.turns.some((turn) => isRecord(turn) && turn.superseded !== true);
}
