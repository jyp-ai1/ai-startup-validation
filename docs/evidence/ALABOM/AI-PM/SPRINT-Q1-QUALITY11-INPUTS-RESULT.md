# Sprint Q1 quality-11 — 세 입력

quality-11은 **FAIL**이다. 세 입력 모두 질문, 선택지, 수익 문자열, 지불자, 요약, 사실은 계약과 같았다. 제품 파서는 분석을 만들지 못했다. 모델이 `키 값: 미확인`처럼 한 줄에 적힌 칸을 빠뜨렸다. 기본값은 `quality-2`다. 1차 완료가 아니다. quality-8·quality-9·quality-10 증거 파일은 바꾸지 않았다.

원문은 `sprint-q1-quality11-inputs-recorded.json`이다. 실행 SHA `475903ec07c225d9a8af86890534c96908e3f0f4`. 시작 2026-10-29 17:42:42 KST, 종료 17:42:52 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON, finish `stop`. `productFollowUpInvoked`는 false다.

프롬프트 버전은 `quality-11-cpo-draft:brewery`, `quality-11-cpo-draft:experience`, `quality-11-cpo-draft:supplier`다. 반환된 키는 세 입력 모두 `summary`, `customer`, `nextQuestion`, `choices`, `revenueModel`, `founderFacts`, `inferences`, `payer`뿐이다.

## 항목

이 판정은 이 SHA의 파서 기준이다. 수익은 항목별 `가설:`이다.

| 입력 | 파서 | 질문 | 선택지 | 없는 축 | 요약 | 지불자 | 수익 항목 | 사실·추론 |
|---|---|---|---|---|---|---|---|---|
| 양조장 | **FAIL**. `unstructured_response` | 원문의 질문은 `무엇을 먼저 검증할 것인가?` | 원문의 선택지는 다섯 개 | 원문에 없는 축 없음 | 원문 요약에 체험과 마케팅 지원이 있다 | 원문 `미확인` | 네 항목 모두 `가설:` | 사실은 입력 두 문장. 추론은 지정된 한 줄 |
| 체험만 | **FAIL**. `unstructured_response` | 원문은 `막걸리 만들기체험에서 무엇을 먼저 확인할 것인가?` | 체험 선택지 다섯 개 | 공급자 마케팅 없음 | 체험 구상 | `미확인` | 네 항목 모두 `가설:` | 입력 문장. 추론 `미확인` |
| 공급자 마케팅 | **FAIL**. `unstructured_response` | 원문은 `온라인 마케팅 페이지 대행에서 무엇을 먼저 확인할 것인가?` | 대행 선택지 다섯 개 | 관광객 체험 없음 | 페이지 대행 구상 | `미확인` | 네 항목 모두 `가설:` | 입력 문장. 추론 `미확인` |

질문·선택지·수익이 맞아도 파서가 거절하면 그 입력은 통과가 아니다. 단위 테스트 통과와 별개다.

## 원인

`nextQuestion 값` 다음 줄의 질문은 복사됐다. `problem 값: 미확인`처럼 이름과 값이 한 줄인 칸은 빠졌다. 빠진 칸은 문제, 가치, 운영, 시장, 경쟁, 판단, 질문 이유, 강점, 위험, 가정, 확인 자료다.
