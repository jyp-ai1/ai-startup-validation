# Sprint 2 최종 품질 증거

2026-11-01 09:09 KST. PR #226. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. 기존 행은 수정하지 않았다.

요청 원문: `docs/evidence/ALABOM/AI-PM/sprint-2-quality-2-15-requests.json`

## 1. 기술적으로 구현된 것

- 제품 1차 요청은 `quality-2`다. `quality-15-whole-business`는 제품 경로에 없다.
- 두 요청은 같은 양조장 체험·마케팅 지원 입력을 쓴다. 요청 원문을 저장했다. 응답 `raw`는 둘 다 `null`이다.
- `quality-15`는 `product`, `supply`, `marketing`을 요구한다. 입력에 없는 칸은 `이 입력에서는 확인되지 않음`이다. 빈 칸과 입력에 없는 숫자는 구조 게이트에서 실패한다.
- 단계 질문은 `verificationPurpose`를 가진다. 같은 문장과 같은 목적은 호출 1회로 실패한다.
- 전략 유용성 다섯 항목은 응답이 있어도 이 코드가 통과시키지 않는다.
- 표현만 바꾼 발굴 질문 쌍은 평가 기준 FAIL이다. 그 쌍은 모델 응답이 아니다.

유용성 기준:

| id | 기준 |
| --- | --- |
| structure | 최초 분석이 고객, 문제, 제품, 공급, 시장, 수익, 운영과 그 연결, 핵심 가설을 설명하는가 |
| answer_reflection | 답변 이후 유지되는 판단, 바뀌는 판단, 그 이유가 구분되는가 |
| resolved_open | 해결된 문제와 아직 열린 문제가 구분되는가 |
| operating_links | 공급자 확보, 상품 구성, 고객 확보, 운영, 수익 구조가 연결되는가 |
| question_advance | 다음 질문이 후보 선정, 접촉, 협력 의사, 공급 조건으로 나아가는가. 발굴 경로의 재질문은 발전이 아니다 |

## 2. 주입 테스트로 확인된 것

2026-11-01 09:09 KST.

- `quality-2` 빌더와 제품 `buildFirstReviewRequest`가 같다.
- 저장한 요청 JSON이 현재 빌더와 같다. `callCount` 0, 토큰 `null`, 두 `raw`는 `null`.
- 칸이 채워진 `quality-15` JSON은 구조 게이트를 지나고, 유용성 다섯 항목은 모두 `not_run`이다.
- 모델 응답이 없는 질문 목적 평가는 `not_run`이다.
- 평가 기준 쌍은 `fail`이고, 근거 문장은 모델 응답이 아니라고 적는다.

이전 단계 테스트 18건은 저장 계약이다. 부모 행과 완료 시각 유지, 복사 답 실패, 같은 목적 실패, 주장과 확인된 사실의 구분. 그 통과를 전략 품질로 세지 않는다.

## 3. 실제 AI 전략 컨설팅 품질로 입증된 것

없다.

| 항목 | 상태 |
| --- | --- |
| quality-2 응답 원문 | NOT RUN, `raw: null` |
| quality-15 응답 원문 | NOT RUN, `raw: null` |
| 어느 쪽이 사업 구조를 더 잘 연결하는지 | NOT RUN |
| Founder 답변 후 판단의 유지·변경·이유 | NOT RUN |
| 해결된 문제와 미해결 문제의 실제 구분 | NOT RUN |
| 다음 질문이 검증 수준을 높였는지 | NOT RUN |
| 표현만 바꾼 반복이 모델 출력에 있는지 | NOT RUN |
| 호출 횟수 | 0 |
| 토큰 | null. 측정하지 않음 |
| 로그인 브라우저 | NOT RUN |

평가 기준 쌍의 FAIL은 실사용 결과가 아니다.

## 실호출에 필요한 환경

`GPT_API_KEY`가 있는 비프로덕션 프로세스에서 `executeWholeBusinessCompare`를 한 번 실행한다. 반환된 응답 원문과 토큰을 저장한다. Founder 프로젝트에 행을 넣지 않는다. 수리 호출을 하지 않는다. 응답을 만들지 않는다. 시뮬레이션을 Founder 결과로 적지 않는다.

이 환경에는 `GPT_API_KEY`와 `OPENAI_API_KEY`가 없다. 그래서 위 실행은 NOT RUN이다.
