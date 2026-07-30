/** Relative time labels for investigation UI — no mock clock times (Zero Lie P0-6). */

export function formatRelativeMinutesAgo(
  minutesAgo: number,
  labels: {
    justNow: string;
    minutesAgo: (minutes: number) => string;
    analyzing?: string;
  },
): string {
  if (minutesAgo < 0 && labels.analyzing) return labels.analyzing;
  if (minutesAgo <= 0) return labels.justNow;
  return labels.minutesAgo(minutesAgo);
}
