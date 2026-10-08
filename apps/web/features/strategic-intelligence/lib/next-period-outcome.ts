/**
 * Next-period / next-customer outcome after a first 2/2 DCE.
 * A plan to measure later is not the same as a held result.
 */

const STAKE = /(no-show|노쇼|반품률|반품|누락|불일치|미스매치|이탈|부하)/i;
const NEXT = /(다음\s*기간|다음\s*고객|다음\s*달|다음\s*주기)/;
const HELD = /(유지됐|유지되었|같은 방향|반복됐|반복되었)/;
const IMPROVED = /(줄었|감소했|개선됐|개선되)/;
const PLANNED = /(예정|계획|준비\s*중|측정할|확인할 예정)/;
const WORSE = /(늘었|악화|증가했|해지)/;

function compact(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isNextPeriodPlannedText(text: string): boolean {
  const line = compact(text);
  if (!line || !NEXT.test(line) || !PLANNED.test(line)) return false;
  return !HELD.test(line) && !IMPROVED.test(line);
}

export function isNextPeriodHeldText(text: string): boolean {
  const line = compact(text);
  if (!line || !NEXT.test(line) || isNextPeriodPlannedText(line)) return false;
  if (WORSE.test(line) && !HELD.test(line) && !IMPROVED.test(line)) return false;
  return (STAKE.test(line) || HELD.test(line)) && (HELD.test(line) || IMPROVED.test(line));
}
