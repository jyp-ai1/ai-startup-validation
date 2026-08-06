/**
 * S16 P0-5 — seed enough analyzable text for empty create → AI asks,
 * without inventing a business from the project filename/title alone.
 * AI admits unknowns (사업 / 고객 / 문제).
 */
export function buildEmptyProjectConversationSeed(projectTitle?: string | null): string {
  const title = projectTitle?.trim() || '새 프로젝트';
  return [
    `프로젝트 이름: ${title}`,
    '',
    '사업: 아직 확인되지 않음 — AI가 모릅니다.',
    '고객: 아직 확인되지 않음 — AI가 모릅니다.',
    '문제: 아직 확인되지 않음 — AI가 모릅니다.',
    '',
    '문서가 없습니다. 대표님께 직접 여쭙겠습니다.',
  ].join('\n');
}
