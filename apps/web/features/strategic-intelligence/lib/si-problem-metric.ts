/**
 * Document-derived problem metric. Not a closed noun list, not a business name.
 * A quantity is a stake only when the line frames a current harm (rate or incident),
 * not a market forecast, target KPI, or payment headcount.
 */

const KNOWN_STAKE = /(no-show|노쇼|반품률|반품|누락|불일치|미스매치|이탈|부하)/i;
const PAYMENT_ONLY =
  /(결제했|지불했|구독을 결제|수수료를 결제|수탁 비용을 결제|렌탈을 결제|유료 전환)/;
const MOVED = /(줄었|늘었|감소|증가|악화|개선|나빠)/;
const FORECAST = /(CAGR|전망|시장\s*규모|TAM|SAM|SOM|억\s*달러|\$\d)/i;
const TARGET_OR_PLAN = /(가설|목표|예정|계획|줄이면|높이면|감소 시|시 ROI|유지율.{0,8}이상)/;
const NOT_METRIC =
  /결제|구독|후보|고객|구매자|물류사|치과|선사|공장|학교|대표|사장|파일럿|코호트|전환|CAGR|시장|전망|유지율/;

function knownStake(line: string): string | null {
  const match = line.match(KNOWN_STAKE);
  return match?.[1] ?? null;
}

function hasCurrentProblemFrame(before: string, after: string): boolean {
  if (/(?:이|가|은|는)\s*$/u.test(before)) return true;
  if (/(을|를)\s*(겪|달)/.test(after)) return true;
  return false;
}

/**
 * Noun phrase sitting next to a current problem quantity (% / 건).
 * Skips payment-only, forecast, and target lines so "2곳이 결제했다" is not a metric.
 */
export function extractProblemMetric(line: string): string | null {
  const text = line.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (PAYMENT_ONLY.test(text) && !MOVED.test(text)) return knownStake(text);
  if (FORECAST.test(text) && !MOVED.test(text) && !KNOWN_STAKE.test(text)) return null;
  if (TARGET_OR_PLAN.test(text) && !MOVED.test(text) && !KNOWN_STAKE.test(text)) {
    return null;
  }

  const quantities = [...text.matchAll(/(\d+)\s*(?:~\s*\d+)?\s*(%|건)/g)];
  for (const match of quantities) {
    const index = match.index ?? 0;
    const before = text.slice(Math.max(0, index - 28), index).replace(
      /(?:주|월|출항)?\s*(?:건당|1인당|인당)?\s*$/u,
      '',
    );
    const after = text.slice(index + match[0].length, index + match[0].length + 12);
    const noun = before.match(
      /([A-Za-z가-힣-]{2,}(?:\s+[가-힣]{2,})?)\s*(?:이|가|은|는|으로|로|을|를)?\s*$/u,
    );
    if (!noun) continue;
    const token = noun[1].trim().replace(/[이가은는]$/u, '');
    if (token.length < 2 || NOT_METRIC.test(token)) continue;
    if (KNOWN_STAKE.test(token) || KNOWN_STAKE.test(text)) return token;
    if (!hasCurrentProblemFrame(before, after) && !MOVED.test(text)) continue;
    return token;
  }
  return knownStake(text);
}

export function lineNamesMetric(line: string, metric: string): boolean {
  return metric.length > 0 && line.includes(metric);
}

export function isProblemMetricImproved(line: string): boolean {
  if (!extractProblemMetric(line) && !KNOWN_STAKE.test(line)) return false;
  if (/(악화|늘었|증가했)/.test(line) && !/(줄었|감소했|개선)/.test(line)) return false;
  if (/(줄었|감소했|개선됐|개선되)/.test(line)) return true;
  const pair = line.match(/(\d+)\s*%.{0,12}(에서|→)\s*(\d+)\s*%/);
  return pair !== null && Number(pair[3]) < Number(pair[1]);
}

export function isProblemMetricWorsened(line: string): boolean {
  if (!extractProblemMetric(line) && !KNOWN_STAKE.test(line)) return false;
  if (/(악화|늘었|증가했|나빠)/.test(line)) return true;
  const pair = line.match(/(\d+)\s*%.{0,12}(에서|→)\s*(\d+)\s*%/);
  return pair !== null && Number(pair[3]) > Number(pair[1]);
}

export function isOffAxisResaleCompletion(line: string): boolean {
  return /(C2C|재판매|리세일)/.test(line) && /(등록했|거래됐|거래가 됐|거래가 발생|체결됐)/.test(line);
}
