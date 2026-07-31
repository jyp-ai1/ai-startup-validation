/** Regression corpus — docs/first-trust/ZERO_LIE_CORPUS.md */

export const ZERO_LIE_PHRASES = [
  '예상 서비스 사용자',
  '예상 서비스 사용자는',
  'PDF를 모두 읽었습니다',
  '사업계획서를 모두 읽었습니다',
  '사업계획서를 먼저 읽었습니다',
  'B2C 진입이 유리',
  '검색량 증가',
  '예상 고객은 창업자',
  '개인 창업자입니다',
  '가장 먼저',
  '분석했습니다',
  '이미 상당히 잘 작성',
] as const;

export const SPECULATIVE_PATTERNS: RegExp[] = [
  /예상/,
  /보입니다/,
  /아마/,
  /가능성/,
  /일 것으로/,
  /판단됩니다/,
  /유리합니다/,
  /추정/,
  /으로 보입니다/,
  /~일 것/,
];

export const NEXT_ACTION_MARKERS = [
  '다음으로',
  '알려주세요',
  '선택해 주세요',
  '정의하겠습니다',
  '확인 부탁',
  '같이 정의',
  '같이 정리',
  '진행하겠습니다',
] as const;
