/** Automation platform utilities. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateTraceId(): string {
  return crypto.randomUUID();
}
