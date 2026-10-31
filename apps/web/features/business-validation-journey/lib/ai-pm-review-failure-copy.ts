/** Client-safe failure copy. This file does not import the review server module. */
export function reviewModelUnavailableCopy(error?: string | null): string | null {
  if (error === 'gpt_api_key_missing' || error === 'engine_unconfigured') {
    return '지금은 모델 검토를 실행할 수 없습니다. 입력한 내용은 남아 있고, 이전 분석이 있으면 그대로 둡니다.';
  }
  return null;
}

export function reviewFailureCopy(failure: string | null): string {
  if (failure === 'revenue_model_type') return '수익 구조가 문자열이 아니어서 분석으로 표시하지 않습니다.';
  if (failure === 'invalid_json' || failure === 'unstructured_response') {
    return '응답이 제품이 읽는 필드와 달라 분석으로 표시하지 않습니다.';
  }
  if (failure === 'call_limited') {
    return '호출 한도에 도달해 이번 검토는 저장하지 못했습니다. 이전 분석과 입력한 답은 남아 있고, 한도가 풀리면 다시 시도할 수 있습니다.';
  }
  return '검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.';
}
