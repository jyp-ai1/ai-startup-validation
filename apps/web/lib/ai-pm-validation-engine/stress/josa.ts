/** Korean particle selection for User Agent answers (harness quality — not AI PM logic). */

function finalJong(word: string): number | null {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  if (/[0-9]/.test(ch)) return '2459'.includes(ch) ? 0 : 1;
  return null;
}

function hasBatchim(word: string): boolean {
  const j = finalJong(word);
  return j !== null && j !== 0;
}

export const eunNeun = (w: string) => `${w}${hasBatchim(w) ? '은' : '는'}`;
export const iGa = (w: string) => `${w}${hasBatchim(w) ? '이' : '가'}`;
export const eulReul = (w: string) => `${w}${hasBatchim(w) ? '을' : '를'}`;
export const gwaWa = (w: string) => `${w}${hasBatchim(w) ? '과' : '와'}`;
export const iNa = (w: string) => `${w}${hasBatchim(w) ? '이나' : '나'}`;
/** 으로/로 — ㄹ batchim takes 로. */
export const euroRo = (w: string) => {
  const j = finalJong(w);
  return `${w}${j !== null && j !== 0 && j !== 8 ? '으로' : '로'}`;
};
/** Copula: 입니다 after any final; 이에요-style not needed. */
export const ida = (w: string) => `${w}입니다`;
