/** Client-safe failure copy. This file does not import the review server module. */
export function reviewFailureCopy(failure: string | null): string {
  if (failure === 'revenue_model_type') return '수익 구조가 문자열이 아니어서 분석으로 표시하지 않습니다.';
  if (failure === 'invalid_json' || failure === 'unstructured_response') {
    return '응답이 제품이 읽는 필드와 달라 분석으로 표시하지 않습니다.';
  }
  return '검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.';
}
