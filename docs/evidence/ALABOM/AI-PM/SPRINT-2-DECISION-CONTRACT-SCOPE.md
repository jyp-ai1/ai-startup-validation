# Sprint 2 판단 계약 구현 영향 범위와 검증 계획

2026-11-01 21:12 KST. PR #226.

이 문서는 구현 영향 범위와 검증 계획이다. 코드는 바꾸지 않았다. GPT 호출은 0회다. 프롬프트 문장은 바꾸지 않았다. 제품 리뷰 파일 `ai-pm-review.ts`는 수정하지 않았다. `runStageReanalysis`는 호출하지 않았다. Founder 프로젝트는 읽거나 쓰지 않았다. Production 배포는 하지 않았다. ADR은 추가하지 않았다. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않는다.

설계 본문은 `docs/evidence/ALABOM/AI-PM/SPRINT-2-DECISION-CONTRACT-DESIGN.md`다. 그 문서는 유지한다. 실험 B 원문 `docs/evidence/ALABOM/AI-PM/sprint-2-experiment-b-run2.json`과 하니스 `apps/web/features/business-validation-journey/lib/ai-pm-experiment-b.ts`도 실패 기록으로 유지한다. 기대 토큰 목록 `answerContentTokens`를 늘려 그 실패를 통과로 바꾸지 않는다.

## 1. 현재 기준 상태

| 항목 | 상태 |
| --- | --- |
| 실험 B | FAIL |
| Sprint 1 | PASS |
| Sprint 2 | PARTIAL |
| 판단 계약 설계 | 승인 방향 유지 |
| 구현 | NOT STARTED |
| 추가 GPT 실호출 | NOT STARTED |
| Priority Selection 품질 | NOT TESTED |
| Sprint 3~6 | 대기 |
| Production | LOCKED |

## 2. 라운드 실패 규칙

GPT가 답변에 없는 사실을 만들어 사업성 판단이 개선됐다고 적는 라운드는 실패다.

이번 기준 사례는 2차 상태 호출 `chatcmpl-EfOPell6IhiurPVKWaGfV6i4ReJUA`다. 답은 `체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다.`이다. 출력은 `양조장 체험에 대한 수요가 충분하다`를 변화와 영향으로 적었다. 그 문장은 답에 없다. 그 라운드는 실패로 유지한다. 선택 호출은 나가지 않은 상태로 유지한다.

## 3. 구현 영향 범위

착수 후 첫 구현은 실험 경로의 순수 검사와 요청 조립이다. 제품 상담 경로는 이 범위 밖에 있다.

### 3.1 착수 후 포함하는 파일

| 파일 | 역할 |
| --- | --- |
| `apps/web/features/business-validation-journey/lib/ai-pm-decision-contract.ts` | 새 순수 모듈. 요청에 이번 답이 있는지, 변화의 span, 미확인 보존, 판단 델타, 선택 입력 자격을 판정한다. 모델을 호출하지 않는다. 후보를 고르지 않는다 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-decision-contract.test.ts` | 새 단위 테스트. 네트워크 없음. 실험 B 저장 원문과 손수 만든 장부를 넣는다 |
| `apps/web/features/business-validation-journey/lib/ai-pm-decision-contract-run.ts` | 새 실행기. 계약 통과 전에 선택 호출을 보내지 않는다. 실패 행을 저장하고 품질과 저장을 분리한다. `runStageReanalysis`를 호출하지 않는다 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-decision-contract-run.test.ts` | 가짜 `chat`으로 호출 횟수와 요청 JSON을 본다 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-decision-contract.live.test.ts` | 환경 변수로만 열리는 실호출 하니스. 이 계획 단계에서는 파일을 만들지 않는다. 단위 검증 뒤에, 실호출 단계에서 한 번 추가한다 |

실행기가 요청을 만들 때 이번 답은 `currentAnswer` 키의 문자열로 들어간다. 입력을 `answer`라는 다른 필드로 객체째 넘기지 않는다. 키가 없거나 빈 문자열이면 `chat`을 호출하지 않는다.

상태 응답이 계약에 담는 기록은 다음이다.

- 변화: `id`, `statement`, `span`, `spanStart`, `spanEnd`
- 미확인: `unansweredQuestions`, `unconfirmed`
- 델타: `kept`, `modified`, `added`, `withheld`. 각 항목은 변화 id 또는 미확인 id를 가리킨다
- `confirmedFacts`. SIMULATION이면 빈 배열

선택 요청의 사용자 JSON은 위 검사를 통과한 장부, 이번 답, 닫힌 질문, 이전 선택지만 담는다. 근거 없는 문장과 영역 id 순서는 선택 입력이 아니다.

### 3.2 착수 후에도 제외하는 파일

| 대상 | 이유 |
| --- | --- |
| `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` | 제품 모델 `gpt-4o-mini`와 `runStageReanalysis`를 유지한다 |
| `apps/web/features/business-validation-journey/lib/ai-pm-experiment-b.ts` | 실험 B의 실패 경로로 남긴다. `answer_change_missing`용 토큰 목록을 계약으로 바꾸지 않는다 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-experiment-b.test.ts` | 기존 하니스 회귀로 남긴다 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-experiment-b.live.test.ts` | run2를 다시 호출하지 않는다 |
| 라우트, 화면, `packages/ai`의 제품 프롬프트, SQL 마이그레이션 | 판단 계약의 첫 구현이 사용자 화면이나 저장 스키마를 바꾸지 않는다 |
| Founder 프로젝트, Production, Sprint 3 화면 | 잠금과 대기를 유지한다 |
| ADR | 취합 심사 전에 추가하지 않는다 |

제품 경로로 옮기는 작업은 이 범위에 없다. 다중 라운드 취합 심사에서 계약이 유지된 뒤에 별도 범위로 파일 이름을 다시 적는다.

## 4. 검증 계획

검증 순서는 고정한다. 앞 단계가 실패하면 다음 단계의 모델 호출은 나가지 않는다. 단위 검증은 GPT를 호출하지 않는다. 실호출은 네 단계의 단위 검사가 있는 뒤에 한 번만 모아 실행한다.

### 4.1 Answer Grounding

단위 검사:

- run2 사용자 JSON처럼 `currentAnswer`가 없으면 실패다. 가짜 `chat` 호출 횟수는 0이다.
- run2 출력 `양조장 체험에 대한 수요가 충분하다`는 변화로 실패다. 그 문장은 1차 가정, 1차 첫 선택지와 같고 이번 답의 구간이 아니다.
- `presentInAnswers: false`인 문장을 변화의 출처로 쓰면 실패다.
- 이번 답의 정확한 구간 세 건은 통과 후보이다. `체험을 원하는 고객과 상품 구성은 구상이다`, `공급 계약`과 `없다`, `가격`과 `없다`.
- `없다` 또는 `구상` 구간으로 `충분하다`를 쓰면 실패다.
- span이 `currentAnswer.slice(spanStart, spanEnd)`와 다르면 실패다.
- 답과 최초 아이디어에 없는 `점포`, `접촉`이 변화에 있으면 실패다.

이 단계의 통과는 구간이 답 안에 있다는 뜻이다. 우선순위 품질의 통과가 아니다.

### 4.2 Unknown Preservation

단위 검사:

- 닫힌 질문 `양조장 체험에 대한 수요가 충분한가?`는 그 질문을 정하는 변화 id가 없으면 `unansweredQuestions`에 있다.
- 같은 질문이 답변됨과 미답변 양쪽에서 빠지면 실패다.
- 답변됨으로 표시했는데 변화 id가 없거나 그 변화가 근거 없으면 실패다.
- 실제 구매는 `unconfirmed`에 있다.
- 수요 충족 문장이 `answerDelta`나 긍정 주장에 있으면 실패다.
- SIMULATION의 `confirmedFacts`에 항목이 있으면 실패다.

### 4.3 Judgment Delta

단위 검사:

- 수요 불확실의 `kept`는 미확인 id를 가리킨다.
- 상품 구상, 공급 계약 없음, 가격 없음의 `added`는 각 변화 id를 가리킨다.
- 사업성 `withheld`는 수요와 실제 구매의 미확인 id를 가리킨다.
- 불확실을 수요 충족으로 바꾼 `modified`는 실패다.
- `judgmentKept: true`이면서 영향 문장이 선택지와 같으면 실패다.
- 근거 없는 변화 id를 가리키면 실패다.

### 4.4 Priority Selection

단위 검사로 먼저 보는 것:

- 4.1부터 4.3이 실패하면 선택 요청을 만들지 않는다. 가짜 `chat`의 선택 호출은 0이다.
- 통과한 장부만 선택 요청에 들어간다.
- 선택 id는 후보 안에 있다. 코드는 그 id를 고르지 않는다.
- 선택 이유는 통과한 변화 id 또는 미확인 id를 가리킨다.
- 다음 질문은 닫힌 질문과 같지 않다.
- 다음 선택지는 이전 선택지와 같지 않다.

이 단위 검사는 기계 조건이다. Priority Selection 품질은 여기서도 NOT TESTED다. 품질은 4.5의 실호출 출력으로만 판정한다.

### 4.5 다중 라운드 실호출 한 번

단위 검사 4.1부터 4.4가 저장소에 있고, 구현 착수가 허용된 뒤에 연다.

| 항목 | 계획 |
| --- | --- |
| 횟수 | 1차부터 4차까지 한 체인. 중간 실패 라운드에서 멈춘다. 실패 라운드를 프롬프트 수정 후 다시 호출하지 않는다 |
| 입력 | 실험 A·B와 같은 사업 본문과 같은 SIMULATION 답. 테스트 sqlite 프로젝트. Founder 프로젝트 아님 |
| 모델 | 하니스 `gpt-4o`. 제품 모델 `gpt-4o-mini`는 그대로다. 제품 함수는 호출하지 않는다 |
| 기록 | 요청, 응답, 실행 id, 토큰, 계약 판정, 행 id를 한 JSON에 남긴다 |
| 취합 | 실행한 라운드를 한 보고로 모은다. 라운드별 중간 합격 선언은 없다 |
| 비용 | 실행 후 저장소 요금표를 적는다. 요금표는 청구서가 아니다. 금액이 작아진 것을 품질 향상으로 적지 않는다 |

라운드 적용:

- 1차는 최초 검토다. 아직 이번 답이 없으면 판단 계약의 후속 규칙을 적용하지 않는다. 1차 질문과 선택지는 2차의 닫힌 질문과 미해결 가정으로 남는다.
- 2차부터 각 답에 4.1, 4.2, 4.3을 적용한다. 셋이 통과한 라운드만 4.4 선택 호출을 한다.
- 어떤 라운드든 답에 없는 사실을 만들어 사업성 판단이 개선됐다고 적으면 그 라운드는 실패다. 이후 라운드는 NOT RUN이다. 선택 품질은 그 체인에서 NOT TESTED로 남는다.
- 3·4차는 직전 라운드의 장부가 계약을 통과했을 때만 실행한다.

취합 보고에 적을 판정은 라운드별 계약 결과, 선택 호출의 실행 여부, 토큰, 저장 행의 재조회다. Sprint 2 PASS 문장은 그 보고에 넣지 않는다. 최종 심사는 그 한 보고를 본 뒤에 한다.

## 5. 저장

계약 실패도 행으로 남긴다. 품질 필드는 실패다. 같은 답의 재조회는 그 행을 읽고 모델을 다시 호출하지 않는다. 행 오류 문자열은 하니스 라벨로 둔다. 제품 `ai-pm-review.ts`의 이슈 코드는 추가하지 않는다.

## 6. 착수 전 상태

이 계획의 제출로 구현이 시작된 것은 아니다. 구현은 NOT STARTED다. 추가 GPT 실호출은 NOT STARTED다. 설계 방향은 유지한다. 착수 후 첫 커밋은 4.1의 순수 검사와, 답이 없는 요청에서 `chat`을 호출하지 않는 실행기다. 선택 품질을 보여주는 실호출은 4.5까지 가지 않는다.
