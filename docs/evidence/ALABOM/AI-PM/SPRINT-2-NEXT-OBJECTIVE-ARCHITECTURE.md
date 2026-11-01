# Sprint 2 다음 검토 목적 생성 설계

2026-11-01 17:48 KST. PR #226.

이 문서는 설계다. 코드는 바꾸지 않았다. GPT 호출은 0회다. Founder 프로젝트는 읽거나 쓰지 않았다. Production 배포는 하지 않았다. 저장 검증기는 바꾸지 않았다. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않는다.

근거 실행은 `chatcmpl-EfLOkyOcJrd5Z6jdlZi72ayH6tI73`, 검토 `ca95e016-46a6-494b-ae36-0c0a722a1c46`, 코드 `f2513c2c`, 증거 `f9583411`이다. 원문은 `docs/evidence/ALABOM/AI-PM/sprint-2-next-objective.json`이다.

## 1. 현재 목적 선택 구조

단계 재검토는 호출 1회다. `runStageReanalysis`가 `buildProductReanalysisRequest`로 사용자 JSON을 만들고, `stageReanalysisSchema`가 응답 칸을 고정한다. 저장 판정은 응답이 돌아온 뒤 `judgeStageContract`가 한다. 질문 목적 비교는 `questionPurposeKey`이고, 같은 목적이면 `stage_questions_repeated`다. 이 판정은 생성 전에 후보를 만들지 않는다.

`stageBusinessState`가 사용자 JSON의 첫 객체 `businessState`를 조립한다.

| 칸 | 이번 요청에 실제로 들어간 값 | 질문 생성에서의 역할 |
| --- | --- | --- |
| originalIdea | 전통주 양조장 체험과 온라인 마케팅 지원 | 최초 아이디어. 전달은 됐다 |
| model.product | `아직 분석되지 않았다` | 상태 표식. 목적 선택 칸과 연결되지 않는다 |
| model.supply | `not_analyzed` / `아직 분석되지 않았다` | 상태 표식. 목적 선택 칸과 연결되지 않는다 |
| model.operations | `양조장과의 협력 및 체험 프로그램 운영, 온라인 마케팅 전략 수립` | 1차 검토가 쓴 문장을 현재 운영으로 다시 넣는다 |
| model.risks | 수요 변동, `양조장과의 협력 관계 불안정성`, 경쟁 | 1차 검토의 위험 문장을 현재 위험으로 다시 넣는다 |
| claims | 상품은 구상, 공급 계약과 가격은 없다, 연습 입력 | 답의 주장. 응답 목적에 쓰이지 않았다 |
| confirmed | `[]` | 확인된 사실 없음 |
| reviewedObjectives | `양조장과의 협력 관계를 어떻게 구축할 것인가?` | 이미 한 질문 |
| resolved | `[]` | 코드가 항상 빈 배열로 넣는다. 부모의 해결 목록을 읽지 않는다 |
| unresolved | 관광객 관심, 협력이 원활할 것, 온라인 마케팅이 효과적일 것 | `latest.uncertain`이다. 1차 검토의 가설 세 문장과 같다 |

`priorJudgmentText`는 `businessState` 밖에 있다. 문장은 `전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.`이다. 판단 문장을 객체 밖으로 뺀 뒤에도 같은 주제가 `model.operations`, `model.risks`, `unresolved`에 남는다.

응답 스키마는 `businessReconstruction`과 `nextReviewObjective`를 `updatedJudgment`보다 앞에 둔다. `nextReviewObjective`는 문자열 하나다. `openGaps`도 문자열 배열이다. 둘을 가리키는 식별자는 없다.

## 2. 여섯 가지 확인

### 2.1 businessState가 다음 질문에 쓰인 방식

모델은 `businessReconstruction.originalIdea`와 `claims`에 최초 아이디어와 세 주장을 다시 적었다. `confirmed`는 빈 배열이다. 상품이 미분석이라는 표식과 `공급 계약과 가격은 없다`는 목적 칸으로 넘어가지 않았다.

`nextReviewObjective`와 다음 질문과 `verificationPurpose`는 모두 닫힌 질문으로 돌아왔다.

- 목적: `양조장과의 협력 관계를 어떻게 구축할 것인가?`
- 질문: `양조장과의 협력 관계를 어떻게 구축할 것인가?`
- verificationPurpose: `양조장과의 협력 관계를 구축하기 위한 구체적인 전략을 확인한다.`

### 2.2 기존 검토 목적이 운영·위험에 중복되는가

중복된다. 닫힌 질문은 협력 관계 구축이다. 같은 호출의 현재 모델은 운영을 `양조장과의 협력 및 체험 프로그램 운영`으로, 위험을 `양조장과의 협력 관계 불안정성`으로 적는다. 이 문장은 이번 답이 새로 쓴 사실이 아니다. 1차 검토 결과의 문장을 `stageBusinessState`가 `model`로 복사한다. 이전 판단의 주제가 현재 사업 상태의 운영과 위험으로 한 번 더 들어간다.

### 2.3 openGaps가 nextReviewObjective에 영향을 줬는가

주지 못했다. 응답 `openGaps`는 네 문장이다.

- `양조장과의 협력 관계가 불확실하다.`
- `관광객들이 전통주 체험에 높은 관심을 가질 것이다.`
- `양조장과의 협력이 원활하게 이루어질 것이다.`
- `온라인 마케팅이 효과적으로 작용할 것이다.`

뒤의 세 문장은 `businessState.unresolved`와 같다. 첫 문장은 그 가설의 협력 주제를 다시 적은 것이다. `claims`의 공급 계약·가격 부재와 상품 미분석은 `openGaps`에 없다. 선택된 목적은 `reviewedObjectives`의 질문 문장과 같다. 갭 목록과 목적 문자열 사이에 참조가 없어서, 목록이 다른 문장을 담아도 목적은 가장 자주 반복된 문장을 고를 수 있다.

### 2.4 해결된 문제와 미확인의 우선순위

구분되지 않는다. `resolved`는 부모에 해결 항목이 없어도, 있어도, 이 함수가 `[]`를 넣는다. `unresolved`에는 1차 가설을 넣는다. 가설 `양조장과의 협력이 원활하게 이루어질 것이다`가 미해결 사업 문제처럼 보인다. 확인된 사실은 비어 있고, 해결된 문제도 비어 있다. 우선순위를 매길 재료가 상태 표식이 아니라 문장 반복이다.

### 2.5 이전 목적과 새 목적을 비교하는 구조

비교 칸이 없다. `reviewedObjectives`는 질문 문장 배열이고 `nextReviewObjective`는 문장 하나다. 모델이 둘을 같다고 적는 칸, 후보마다 중복 여부를 적는 칸은 없다. 비교는 응답 이후 `questionPurposeKey`가 한다. `구축`과 `구체화`를 같은 목적으로 보는 그 비교는 이번 응답에서 질문 저장을 거절했다. 생성 중에는 그 비교가 없다.

### 2.6 직전 판단을 반복하는 원인

한 번의 완성에서 목적 칸이 자유 문장이다. 요청 안에서 가장 자주 반복되는 주제는 양조장 협력이다. 최초 아이디어, 이전 판단, 운영 문장, 위험 문장, 가설 세 문장 중 하나, 이미 한 질문이 그 주제를 가리킨다. 상품 미분석과 공급·가격 주장은 각 한 자리만 차지한다. 자유 문장 목적은 그 반복으로 닫힌다.

순서만 바꾼 실험은 이미 했다. `businessReconstruction`과 `nextReviewObjective`를 판단 문장보다 앞에 두었고, 모델은 그 칸을 채운 뒤 닫힌 질문을 목적에 복사했다. 칸의 순서는 자유 문장을 다른 주제에 묶지 못했다.

## 3. 이전 실패와 개선 방향

| 시도 | 결과 | 이번 설계가 유지하는 것 |
| --- | --- | --- |
| 목적 문구를 시스템 서두에 넣음 | 질문이 `구축`에서 `구체화`로만 바뀜 | 서두 문구를 더 늘리지 않는다 |
| 스키마의 후보·접촉 사다리를 뺌 | 같은 목적 반복 | 질문 순서를 코드가 정하지 않는다 |
| `businessState`와 판단 객체 분리 | 목적이 닫힌 질문과 같아짐 | 이전 판단은 계속 전달한다 |

개선은 문장 추가가 아니다. 요청이 이전 검토의 산문을 현재 모델로 복사하는 경로를 끊고, 응답이 목적을 고르기 전에 서로 다른 후보와 중복 여부를 적게 한다.

이전 판단은 `priorReview`에 남긴다. 빼는 대상은 판단의 존재가 아니다. `model.operations`와 `model.risks`와 `unresolved`가 그 판단의 주제를 현재 상태인 것처럼 다시 싣는 복사다.

## 4. 제안 아키텍처

한 번의 통합 재검토 안에서 입력을 세 기록으로 나누고, 출력이 후보를 만든 뒤 하나를 고르게 한다.

### A. 사업 상태 기록

`statedRecord`

- 최초 아이디어
- 이번 답과 이전 답의 문장, 출처는 simulation 또는 founder
- confirmed. 근거가 있는 사실만. 없으면 빈 배열

`areaStatus`

코드는 영역을 고르지 않는다. 이미 요청에 있는 사업 칸마다 기계적 상태만 붙인다.

| 상태 | 기계적 기준 |
| --- | --- |
| not_analyzed | 저장된 문장이 비었거나 `아직 분석되지 않았다` |
| unconfirmed | 문장이 `아직 확인되지 않았다`이거나, 이번 주장이 그 칸의 부재를 말함 |
| claim | 파운더 또는 SIMULATION 문장이 그 칸을 말하지만 confirmed가 비어 있음 |
| confirmed | confirmed에 그 칸의 별도 근거가 있음 |

이번 원문에 대응하면 상품과 공급은 `not_analyzed`, 가격은 주장 `공급 계약과 가격은 없다`에 해당하는 `claim`, confirmed는 비어 있다. 이 표는 다음 영역을 순위 매기지 않는다. 배열 순서는 우선순위가 아니다.

`priorReview`

- priorJudgmentText
- reviewedObjectives
- priorHypotheses. 지금의 `unresolved`에 들어가 있는 1차 가설 세 문장
- 1차 검토가 쓴 운영·위험 문장

이 블록은 판단을 갱신할 때 읽는다. `areaStatus`의 상태 값은 이 산문으로 덮지 않는다.

`resolved`는 부모에 해결 목록이 있을 때만 그 목록을 넣는다. 없으면 빈 배열이다. 가설을 미해결 문제 칸에 넣지 않는다.

### B. 목적 선택 기록

같은 응답 안에서 질문보다 앞에 둔다.

`objectiveCandidates`는 2개 이상이다. 각 후보는 다음을 가진다.

- candidateId
- areaId. `areaStatus`의 한 칸
- objective. 질문 문장이 아니라 이번에 새로 할 사업 판단
- importance. 그 판단이 다음 사업 판단에 필요한 이유
- uncertainty. 지금 모르는 것
- prerequisite. 먼저 알아야 하는 것. 없으면 없다고 적는다
- overlapsReviewedObjective. 이미 검토한 목적과 같은 목적인지

`selectedCandidateId`는 그 후보 중 하나다. `selectionReason`은 그 후보를 고른 이유다. 중요성, 불확실성, 선행조건을 그 이유 안에 적는다.

`nextQuestions`는 선택된 후보의 objective만 묻는다. 질문 수와 선택지 문장은 모델이 정한다. 코드는 고객, 상품, 공급, 가격의 순서를 두지 않는다.

같은 목적의 다른 표현은 새 검토가 아니다. `overlapsReviewedObjective`가 참인 후보는 선택 대상이 아니다. 모델이 그 표시를 잘못 적으면, 기존의 `stage_questions_repeated`가 질문 문장에서 같은 목적을 거절한다. 그 거절을 통과시키려고 새 문장 규칙을 넣지 않는다.

### C. 호출 구조 비교

| | 한 호출에서 상태 분석 다음 목적 선택 | 상태 분석 호출과 목적 선택 호출을 분리 |
| --- | --- | --- |
| 맥락 | 최초 아이디어, 답, 이전 판단이 한 요청에 남는다 | 두 번째 요청이 장부를 빠뜨리면 맥락이 끊긴다 |
| 품질 | 후보 강제는 한 완성 안에서만 작동한다. 자유 문장 순서 변경은 이미 실패했다 | 두 번째 요청이 이전 산문 없이 장부만 받으면 반복 주제가 줄어든다. 산문을 다시 넣으면 같은 독점이 돌아온다 |
| 저장 | 지금처럼 검토 행 하나, raw 하나 | raw 둘 또는 합성 raw가 필요하다. 단계 완료 1회 원칙이 깨진다 |
| 실패 | 형식 실패는 지금처럼 행 하나와 원문 보존 | 첫 호출만 성공하면 질문은 없고 분석만 있는 행이 생긴다 |
| 호출 수 | 완료된 단계당 1회 | 완료된 단계당 2회 |
| 토큰 | 이번 호출은 15,195 / 1,303 / 16,498이다. 후보 2~4개는 출력 수백 토큰이다. 입력은 운영·위험 산문을 목적 소스에서 빼면 늘지 않는다 | 두 번째 호출이 전체 맥락을 다시 받으면 입력 약 1.5만 토큰이 한 번 더 든다. 장부만 받으면 그보다 작다. 달러 비용은 이 경로에서 계산하지 않는다 |

우선안은 한 호출이다. 단계 완료 1회, 답변 저장 0회, 미완료 단계 0회를 유지한다. 분리 호출은 한 호출 실험이 다시 닫힌 목적을 복사한 뒤에 검토한다. 그 경우 두 번째 요청은 `areaStatus`, `statedRecord`, `reviewedObjectives`, `priorJudgmentText`만 가지고, 1차 운영·위험 산문은 넣지 않는다.

## 5. 재사용할 코드

유지한다.

- `runStageReanalysis`, `saveReviewFeedback`, 단계 완료 1회
- `buildProductReanalysisRequest`의 최초 아이디어, 답 문장, `priorJudgmentText`, `closedQuestions`
- `stageFieldForRequest`, `currentAnswerStatementPayload`, `closedQuestionPayload`
- `judgeStageContract`의 기존 거절. `stage_questions_repeated` 포함
- 1차 검토 프롬프트와 저장 행

나중에 바꿀 자리만 지정한다. 이번 커밋은 바꾸지 않는다.

- `stageBusinessState`. 산문 복사 대신 `statedRecord`, `areaStatus`, `priorReview`
- `stageReanalysisSchema`. `objectiveCandidates`, `selectedCandidateId`, `selectionReason`
- 단계 시스템 프롬프트 5단계. 새 객체 이름을 가리키게 줄인다. 목적 문구를 덧붙이지 않는다
- 단위 테스트의 스키마 필수 키와 `businessState` 형태

## 6. 데이터 구조

데이터베이스 컬럼과 마이그레이션은 필요 없다. `objectiveCandidates`와 선택 이유는 응답 원문에 남기고, 지금 `businessReconstruction`처럼 저장 섹션의 필수 칸으로 올리지 않는다. 검토 행은 지금의 판단, 질문, 사실, 이슈를 계속 저장한다.

요청 JSON의 형태는 바뀐다. 그것은 저장 스키마가 아니다.

## 7. 구현 범위

승인 뒤에 한 변경으로 끝낸다.

- 요청 조립과 응답 스키마
- 그 형태를 고정하는 단위 테스트
- 새 SIMULATION 프로젝트의 실호출 하니스 1회
- 증거 문서

범위 밖이다.

- Founder 프로젝트
- 기존 실패 행과 기존 마커
- 저장 검증기의 새 문장 규칙
- 질문 순서와 특정 영역의 코드 선택
- 1차 검토 프롬프트
- Production
- Sprint 3
- 승인 전의 GPT 호출

## 8. 테스트 계획

구현 전 단위 테스트는 생성 품질을 통과시키지 않는다. 확인할 형태는 다음이다.

- `areaStatus`의 상품·공급이 이번 원문의 `not_analyzed`를 유지한다
- 1차 가설 세 문장은 `priorHypotheses`에 있고 `unresolved`에 없다
- `resolved`는 부모가 비어 있으면 빈 배열이다
- `priorJudgmentText`는 요청에 남아 있고 `areaStatus`의 상태 값을 덮어쓰지 않는다
- 스키마는 후보 2개 이상을 질문보다 앞에 요구한다
- 기존 112건이 유지하는 판단·사실·반복 거절은 그대로다

승인 뒤 실호출은 1회다.

- 새 sqlite 프로젝트. 답은 SIMULATION
- 1차 검토는 `chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde` 재생
- `chatcmpl-EfLOkyOcJrd5Z6jdlZi72ayH6tI73`은 다시 호출하지 않는다
- 완료된 단계의 모델 호출은 1회, 같은 답의 재검토는 0회
- 볼 것: 후보가 둘 이상인가, 선택 후보가 닫힌 협력 목적과 다른가, 질문과 선택지가 그 후보의 판단을 묻는가, `verifiedFacts`가 비어 있는가, 최초 아이디어와 공급·가격 주장이 요청에 있는가
- 3~4차는 그 결과가 목적을 바꾼 뒤에만 연다

## 9. 호출 비용과 운영

이번 실패 호출은 gpt-4o-mini, 입력 15,195, 출력 1,303, 합계 16,498이다. 입력 예산은 24,000이다. 제안한 한 호출은 그 예산 안에서 후보를 추가한다. 단계 완료의 호출 수는 1로 유지된다. 분리 호출은 완료 단계의 호출 수를 2로 만들고, 저장 행이 둘로 나뉠 수 있다. 달러 금액은 이 경로에 계산 값이 없다.

운영 영향은 생성 방식에 한정된다. 로그인, 결제, 1차 검토, Founder 데이터, Production은 이 설계의 밖이다.

## 10. CTO 판단

사업 상태 칸은 채워졌고 다음 목적은 닫힌 질문이었다. 원인은 문구 부족이 아니다. 이전 검토의 협력 산문이 현재 모델로 복사되고, 가설이 미해결 목록으로 들어가며, 목적 칸이 그 문장들 중 하나를 자유롭게 고른다. `openGaps`는 그 선택과 연결되어 있지 않다.

우선안은 한 호출을 유지한 채 상태 장부와 이전 검토 기록을 나누고, 질문이 후보 선택 뒤에 나오게 하는 것이다. 구현과 실호출은 이 설계 검토 뒤에 둔다.
