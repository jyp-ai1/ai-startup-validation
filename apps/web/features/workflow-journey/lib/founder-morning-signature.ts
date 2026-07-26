/** LaunchLens signature morning opening — four fixed lines; content below varies with data. */
export function buildSignatureMorningGreeting(
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return [
    t('morning.signatureLine1'),
    t('morning.signatureLine2'),
    t('morning.signatureLine3'),
    t('morning.signatureLine4'),
  ].join('\n\n');
}
