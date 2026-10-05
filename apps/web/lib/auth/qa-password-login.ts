import qaLoginIds from './qa-login-ids.json';

export const QA_LOGIN_IDS = Object.freeze(qaLoginIds);

export type QaLoginId = keyof typeof QA_LOGIN_IDS;

const LOGIN_ID_PATTERN = /^[a-z0-9]{2,16}$/;

/** Map a QA login id to its Auth email. Passwords are never stored here. */
export function resolveQaLoginEmail(loginId: string): string | null {
  const normalized = loginId.trim().toLowerCase();
  if (!LOGIN_ID_PATTERN.test(normalized)) return null;
  if (!Object.prototype.hasOwnProperty.call(QA_LOGIN_IDS, normalized)) return null;
  return QA_LOGIN_IDS[normalized as QaLoginId];
}

export function isQaLoginId(loginId: string): loginId is QaLoginId {
  return resolveQaLoginEmail(loginId) !== null;
}

/** admin is an Auth identity only — never treat it as an authorization role. */
export function qaLoginGrantsAdminRole(loginId: string): false {
  void loginId;
  return false;
}
