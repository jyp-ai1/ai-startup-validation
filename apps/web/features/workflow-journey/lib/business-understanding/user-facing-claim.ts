/**
 * Phase 2-D D2 — living claims may hold raw document lines, field labels, or parser
 * placeholders. Those stay in internal state; user-facing questions must not quote them.
 */

import { SHARED_UNDERSTANDING_UNREADABLE_BUSINESS } from './build-shared-understanding';

const FIELD_LABEL_RE = /(?:타겟|타깃|핵심\s*문제|문제|구매|사용|수익|대상)\s*[:：]/u;
const CAMEL_FIELD_RE = /\b[a-z]+[A-Z][A-Za-z]+\b/;
const PARSER_ARTIFACT_RE = /\[(?:Sample|sample|TODO|placeholder)\]|fieldKey|rawLine/i;

export function isInternalClaimText(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (v.includes(SHARED_UNDERSTANDING_UNREADABLE_BUSINESS)) return true;
  if (FIELD_LABEL_RE.test(v)) return true;
  if (CAMEL_FIELD_RE.test(v)) return true;
  if (PARSER_ARTIFACT_RE.test(v)) return true;
  return false;
}

/** Null when the value must not be quoted in a founder-facing question. */
export function toUserFacingClaimSnippet(
  value: string | null | undefined,
  max = 48,
): string | null {
  const v = value?.trim() ?? '';
  if (v.length < 2 || isInternalClaimText(v)) return null;
  return v.length > max ? `${v.slice(0, max)}…` : v;
}
