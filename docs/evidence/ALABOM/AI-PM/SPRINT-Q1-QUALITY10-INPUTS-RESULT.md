# Sprint Q1 quality-10 — 세 입력

quality-10은 **FAIL**이다. 세 입력 모두 제품 파서는 분석을 읽었다. 선택지는 각 사업의 배열이었다. 수익 문자열은 세 입력 모두 한 항목으로 줄었다. 양조장 질문은 선택지 첫 줄과 같다. 기본값은 `quality-2`다. 1차 완료가 아니다. `sprint-q1-quality8-recorded.json`, `sprint-q1-quality9-recorded.json`, `sprint-q1-quality9-inputs-recorded.json`은 바꾸지 않았다.

원문은 `sprint-q1-quality10-inputs-recorded.json`이다. 실행 SHA `7042259fcde12fbfe656c9f8e4f8c9432f3c0a91`. 시작 2026-10-29 17:35:42 KST, 종료 17:35:57 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON. `productFollowUpInvoked`는 false다. 이 값만으로 브라우저 후속 호출이 없었다고 보지 않는다.

프롬프트 버전은 `quality-10-cpo-draft:brewery`, `quality-10-cpo-draft:experience`, `quality-10-cpo-draft:supplier`다. 질문과 선택지 문구는 사용자 메시지에 적혀 있었다. 모델이 그 문구를 되풀이한 것은 독립 생성의 증거가 아니다.

## 항목

수익 판정은 항목별 `가설:`이다. `scoreSprintGates`의 Q2는 원문 어딘가에 `가설`이 있으면 통과한다. 그 통과는 이번 수익 계약의 통과가 아니다.

| 입력 | 파서 | 질문 | 선택지 | 없는 축 | 요약 | 지불자 | 수익 항목 | 사실·추론 |
|---|---|---|---|---|---|---|---|---|
| 양조장 | PASS | **FAIL**. `nextQuestion`이 `관광객 대상 양조장 체험 상품을 먼저 검증`이다. 질문은 `nextVerification`에 있다 | PASS | PASS | **FAIL**. 요약에 마케팅 지원이 없다 | PASS. `미확인` | **FAIL**. `가설: 체험 참가비`만 있다 | PASS. 추론은 지정된 한 줄의 복사다 |
| 체험만 | PASS | PASS. `막걸리 만들기체험에서 무엇을 먼저 확인할 것인가?` | PASS | PASS | PASS | PASS. `미확인` | **FAIL**. `가설: 체험 참가비`만 있다 | PASS. `inferences`는 `미확인` |
| 공급자 마케팅 | PASS | PASS. `온라인 마케팅 페이지 대행에서 무엇을 먼저 확인할 것인가?` | PASS | PASS | PASS | PASS. `미확인` | **FAIL**. `가설: 마케팅 서비스 수수료`만 있다 | PASS. `inferences`는 `미확인` |

체험 원문의 `alternatives`는 `기타 전통주 체험 프로그램`, `competition`은 `기타 전통주 체험 업체`다. 입력에 없는 업체다. 공급자 원문의 `value`는 `효율적인 온라인 마케팅을 통해 고객 유치`다. 입력에 없는 성과다. 양조장 기존 게이트 Q1·Q5는 FAIL, Q6은 PASS다.

## Q9·Q10

이 파일의 모델 호출은 Preview 빌드의 비교 스크립트다. 브라우저 저장·재인증과 서버 호출 로그는 실행하지 않았다.
