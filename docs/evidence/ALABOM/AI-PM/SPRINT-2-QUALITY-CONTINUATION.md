# Sprint 2 계속 — 최초 분석 점검과 단계 해석 계약

2026-11-01 01:44 KST. PR #226의 저장 계약은 유지한다. 1차 제품 프롬프트 `quality-2`는 바꾸지 않았다. 비교 테스트를 지우거나 기대값을 느슨하게 만들지 않았다. 피벗 테이블은 만들지 않았다. 기존 행은 수정하지 않았다. Production 배포는 하지 않았다. GPT 실호출은 NOT RUN이다.

이 문서는 Sprint 2 PASS를 선언하지 않는다.

## 1. 최초 분석 계약 점검

비교 기준은 두 가지다. 제품 1차 요청은 `firstReviewSystemPrompt()`의 `quality-2`다. 사업 전체 예시 원문은 `docs/evidence/ALABOM/AI-PM/comparison-sources/gpt-supplied.md`다. 그 산문의 프롬프트, 모델, 토큰은 비어 있다. `quality-2`의 모델 응답 원문은 없다. 아래 표는 키와 예시 목차의 비교이고, 실호출 품질 비교가 아니다.

| 사업 영역 | quality-2 키 | 예시 원문 | 판정 |
| --- | --- | --- | --- |
| 고객과 해결할 문제 | `customer`, `problem` | 고객군과 경험 | 키가 있다 |
| 제공 가치 | `value` | 관광객에게 주는 가치, 양조장에 주는 가치 | 키가 있다 |
| 제품 | 없음 | 만들기, 투어, 시음, 코스 | 별도 키가 없다 |
| 공급과 파트너 | `operatingModel`만 인접 | 양조장, 플랫폼 역할 | 공급 키가 없다 |
| 시장과 경쟁 | `market`, `competition` | 시장 교차점과 사례 | 키가 있다. 예시의 외부 가격은 제품 규칙에서 사실로 쓰지 않는다 |
| 마케팅과 판매 | 없음 | 온라인 마케팅, 예약, 제휴 판매 | 별도 키가 없다 |
| 수익 | `revenueModel`, `profitability` | 수익 가설과 사례 가격 | 키가 있다. 비용 구조 키는 없다 |
| 운영과 실행 | `operations`, `operatingModel` | 예약, 언어, 운영 | 키가 있다 |
| 위험과 가설 | `risks`, `assumptions` | 수요가 사례만으로 입증되지 않음 | 키가 있다 |

시스템 문장은 고객, 문제, 기존 대안, 가치, 이용자와 지불자, 수익 구조, 운영, 차별화, 경쟁을 검토하라고 한다. 사용자 문장의 키 목록에는 `alternatives`, `differentiation`이 없다. 제품, 공급, 마케팅은 시스템 문장과 사용자 키 목록 모두에 없다.

저장된 제품 발췌와의 이전 비교는 `docs/evidence/ALABOM/AI-PM/QUALITY-GAP-2026-10-29.md`다. 그 문서의 `quality-2` 모델 출력은 NOT RUN이다.

## 2. 개선안

제품 경로에 넣지 않는다. `buildFirstReviewRequest`는 `quality-2`로 남긴다. 설치는 같은 입력에 대한 `quality-2` 원문과 이 초안의 원문이 둘 다 저장된 뒤에만 검토한다. 이번 턴의 실호출은 NOT RUN이다.

초안 계약:

- 기존 `quality-2` 키를 유지하고 `product`, `supply`, `marketing` 문자열을 더한다.
- 그 사업에서 입력으로 말할 수 없는 영역은 `이 입력에서는 확인되지 않음`이라고 적는다. 빈 문자열과 만든 가격, 인원, 매출은 실패다.
- 모든 사업에 같은 세부 문단을 채우지 않는다. 모델이 이번 사업에서 판단을 가장 크게 바꾸는 영역을 고르고, 그 이유를 `judgment`와 다음 질문에 적는다. 코드는 영역을 빼거나 질문을 고르지 않는다.
- 질문 수는 모델이 정한다. 배열이 1개 이상이면 단계다. 0개는 단계가 아니다.
- 질문과 선택지는 입력에 이미 있는 문장을 다시 묻지 않는다.

이 초안을 지금 제품 요청에 넣으면 `quality-2`와 제품 요청이 같다는 비교 테스트가 깨진다. 그래서 넣지 않았다.

## 3. 이번 코드 변경

단계 재분석만 바꿨다. 질문 수 규칙과 질문 ID 연결은 그대로다.

각 답에 모델이 다섯 문장을 적는다.

- `meaning`: 그 답이 사업에 의미하는 바
- `founderBasis`: Founder가 그렇게 말한 이유
- `observedEvidence`: 접촉, 합의, 입금처럼 확인된 것. 없으면 확인된 접촉이나 합의가 없다고 적는다
- `judgmentEffect`: 이전 판단에서 유지되는 것과 바뀌는 것, 그 이유
- `openRisk`: 남은 미검증 위험

다섯 문장 중 하나라도 그 답의 `choiceLabel` 또는 `supplement`와 같으면 `stage_answer_echo`다. 다음 질문이 이미 한 질문, 선택 라벨, 보충 문장과 같으면 `stage_questions_repeated`다. 둘 다 호출 1회, `sections`는 비고, `rawContent`는 남고, 같은 답의 재제출은 추가 호출이 없다. 부모 `finishedAt`은 유지된다.

성공한 단계의 화면은 그 다섯 문장을 `이번 답의 해석`에 보여 준다. 값이 없으면 그 줄은 나오지 않는다.

코드는 판단을 유지할지 바꿀지 정하지 않는다. 문장이 비었거나 답을 그대로 베끼면 실패로 남긴다.

## 4. 테스트

실행 시각 2026-11-01 01:43 KST. 작업 디렉터리 `apps/web`.

```text
pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts features/business-validation-journey/lib/__tests__/ai-pm-quality-compare.test.ts --reporter=dot
```

단계 테스트 파일은 통과했다. 주입 응답만 사용했다. 확인한 내용:

- 해석 다섯 문장이 `stageReading`과 화면용 view에 저장된다.
- 답을 그대로 복사한 응답은 `failed`, `callCount` 1, 오류 `stage_answer_echo`, 원문 유지, 재제출 호출 없음.
- 다음 질문이 보충 문장과 같으면 `failed`, `callCount` 1, 오류 `stage_questions_repeated`. 부모 고객 `직장인`과 부모 `finishedAt`은 유지된다.
- 정적 렌더에 `이번 답의 해석`, 말한 이유, 판단의 변화, 남은 위험이 있다.
- 양조장 주장을 `verifiedFacts`로 올리지 않는 기존 검증은 유지된다.

비교 테스트 41건 중 2건이 실패했다. 실패는 `quality-compare-requests.json`과 `quality-2-independent-request.json`이 질문 2개 이상이라고 적어 두고, 현재 제품 요청은 Sprint 1 이후 질문 1개 이상인 점이다. 이번 턴에 그 픽스처와 `quality-2` 문장은 수정하지 않았다. 기대값 `toEqual`은 그대로다.

라이브 테스트는 실행하지 않았다.

## 5. 실제 요청과 응답

GPT 실호출 NOT RUN. 이 환경의 `GPT_API_KEY`와 `OPENAI_API_KEY`는 없다. 응답을 만들지 않았다. Founder 프로젝트에 행을 넣지 않았다.

이번 테스트의 답과 분석 문장은 주입한 시뮬레이션이다. 실제 Founder 답 `7d2d04e5`는 다른 질문에 연결하지 않았고, 행을 수정하지 않았다.

판단 변화의 전후 비교는 주입 케이스뿐이다. 부모 고객은 `직장인`으로 남고, 답을 복사한 자식은 분석 칸 없이 실패한다. 실제 GPT가 양조장 협력 주장에서 이유, 확인된 접촉, 판단 변화, 남은 위험을 어떻게 쓰는지는 NOT RUN이다.

## 6. 남은 문제

- 최초 분석의 제품, 공급, 마케팅 키는 제품 경로에 없다. 개선안은 2절이다. 실호출 비교는 NOT RUN.
- 해석 문장이 답을 그대로 베끼지 않았다는 것은 주입 테스트로 확인했다. 그 문장이 사업 판단으로 적절한지는 NOT RUN.
- 다음 질문이 이미 한 문장과 글자가 같으면 실패한다. 표현만 바꾼 반복은 코드가 거르지 않는다. 그 적절성은 NOT RUN.
- 다회차 실사용 흐름과 로그인 브라우저는 NOT RUN. 화면 확인은 정적 렌더다.
- 비교 픽스처 2건은 Sprint 1의 질문 1개 계약과 어긋난 채다. 이번 턴에 맞추지 않았다.
- 단계가 아닌 재분석 프롬프트와 `founderAnswerKinds`의 양조장 분류는 유지한다.
- 피드백 `7d2d04e5`는 성공 사슬의 `priorStagePairs`에 없다.

## 7. 보류

- Sprint 3은 시작하지 않는다.
- 피벗은 HOLD.
- Production은 CEO 승인 전까지 잠금.
- 형식 오류를 숨기는 수리 호출은 단계 경로에 없다.
