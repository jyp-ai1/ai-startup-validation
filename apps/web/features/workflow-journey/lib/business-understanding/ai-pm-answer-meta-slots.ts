/**
 * DAY 8-I P0 FIX-5 — Meta / confirmation utterances (no judgment update).
 */

const META_CONFIRMATION_RE =
  /(?:최종\s*확인|맞는지\s*확인|(?:지금까지|지금\s*까지)\s*말한.*(?:맞|확인)|(?:고객|문제|해결).*(?:맞는지|확인(?:합|하)))/i;

export function isMetaConfirmationAnswer(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 6) return false;
  if (!META_CONFIRMATION_RE.test(t)) return false;
  if (/(?:SaaS|MVP|엑셀|누락|만들|관리하려|체크리스트)/.test(t) && !/맞는지|최종\s*확인/.test(t)) {
    return false;
  }
  return true;
}

export function formatMetaConfirmationAcknowledgement(): string {
  return '알겠습니다. 지금까지 정리한 고객·문제·해결 판단을 최종 확인하는 단계로 기록했습니다. [검토 흐름으로 돌아가기]';
}
