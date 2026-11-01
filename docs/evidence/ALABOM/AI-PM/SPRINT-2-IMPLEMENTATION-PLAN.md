# Sprint 2 — 구현 영향 범위와 단계 계획

2026-11-01 23:29 KST 설계다. 이 문서를 쓰면서 제품 코드를 수정하지 않았고, 프롬프트를 바꾸지 않았고, GPT를 호출하지 않았고, DB를 바꾸지 않았다. 구현은 CPO가 이 세 문서를 승인한 뒤에만 시작한다. 승인 뒤에도 Production 배포와 실제 Founder 세션 변경은 CEO 승인 전이다.

함께 읽는 문서:

- `docs/evidence/ALABOM/AI-PM/SPRINT-2-CONTINUITY-ARCHITECTURE.md`
- `docs/evidence/ALABOM/AI-PM/SPRINT-2-DECISION-CONTRACT.md`
- 실패 원본 `SPRINT-2-FINAL-COMPLETION.md`, `sprint-2-final-completion.json`
- 추적 `SPRINT-2-END-TO-END-TRACE.md`, `sprint-2-end-to-end-trace.json`

## 1. 기술 권고

제품의 기준 경로는 `runStageReanalysis` 1회다. `runDecisionContractFollowUp`의 얇은 요청을 제품 후속으로 올리지 않는다. #227은 그 얇은 요청으로 사업 전체와 질문 id를 넘기지 못했고, 모델은 넘어간 답 문장을 구간으로 남기지 않았다.

기존 검사 함수는 유지한다. 제품 1회 응답에 같은 구간·미확인·델타 규칙을 적용한다. 선택 문장은 그 1회 응답에 두고, 세 검사가 실패하면 저장하지 않는다. 코드는 다른 질문을 골라 넣지 않는다.

1차 시스템 문장과 단계 시스템 문장은 첫 구현 조각에서 고치지 않는다. 먼저 출처 레코드, 미연결 답, `choiceId` 보존, 응답 검사를 붙인다. 현재 문장으로 모델이 계약을 못 쓰면 그 행은 실패로 남는다. 실패를 프롬프트 수정으로 바로 재호출하지 않는다. 프롬프트 문장 변경은 그 실패 원문을 본 뒤의 별도 승인이다.

제품 모델 상수는 `gpt-4o-mini`로 둔다. #227처럼 전송 직전에 `gpt-4o`로 바꾸는 일은 이 변경에 넣지 않는다. 모델 교체는 별도 승인이다. `gpt-4o` 한 번이 구간 기록을 고치지 못했다.

## 2. 수정할 파일

승인 후 최소 범위다. 대규모 재작성은 하지 않는다.

| 파일 | 변경 |
| --- | --- |
| `apps/web/features/business-validation-journey/lib/ai-pm-decision-contract.ts` | 상태 5종과 델타 5종의 검사 추가. `answer_not_recorded` 추가. 기존 `STATE_SYSTEM`, `SELECTION_SYSTEM` 문자열은 유지 |
| `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` | `submitConsultingStage`가 빈 `choiceId`를 `c1`로 넣지 않음. `questionId` 없는 `unlinked` 저장. 다음 제품 요청에 `unlinkedStatements` 포함. 재분석 응답을 검사에 통과한 뒤에만 `succeeded` |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-decision-contract.test.ts` | 기존 9건 유지. 빈 변화와 1차 추정 승격 사례 추가 |
| 새 단위 파일 `ai-pm-continuity-contract.test.ts` | 미연결 저장, 질문 유지, 중복 재사용, 시뮬레이션 분리. 네트워크 0 |

`ai-pm-review.ts` 안의 변경은 저장, 요청 조립, 저장 전 검사에 한정한다. `stageReanalysisSystemPrompt`와 `firstReviewSystemPrompt`의 문장은 이 조각에서 그대로 둔다.

## 3. 추가할 파일

- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-continuity-contract.test.ts`
- 승인 후 실행이 따로 승인되면 그 캡처를 새 증거 파일로 추가. #227 파일은 그 캡처의 대상이 아님

## 4. 수정하지 않을 파일

- `apps/web/features/business-validation-journey/lib/ai-pm-experiment-b.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-sprint2-final-completion.live.test.ts`
- `docs/evidence/ALABOM/AI-PM/sprint-2-final-completion.json`
- `docs/evidence/ALABOM/AI-PM/SPRINT-2-FINAL-COMPLETION.md`
- `docs/evidence/ALABOM/AI-PM/sprint-2-end-to-end-trace.json`
- `docs/evidence/ALABOM/AI-PM/SPRINT-2-END-TO-END-TRACE.md`
- `apps/web/scripts/run-web-build.sh`
- Supabase 마이그레이션
- Founder 프로젝트 데이터
- `packages/ai`의 모델 요율 표

실험 B와 #227 하니스는 실패 재현 경로로 남긴다. 빌드 스크립트에 새 실호출 테스트를 넣지 않는다. Preview 빌드가 이 작업 때문에 GPT를 호출하지 않게 한다.

## 5. 데이터와 API

SQL 스키마 변경은 없다. `StoredReview.sections`와 `StoredFeedback`은 이미 JSON이다. 새 필드는 새 행의 JSON에만 있고, 없는 옛 행은 지금처럼 읽힌다.

미연결 저장은 기존 피드백 행이다. `questionId`는 null, `modelCalls`는 0, 본문은 comment다. 본문에 `unlinked: true`가 있을 때만 이 경로로 받는다. 그 표시가 없는 기존 요청은 지금 검증을 유지한다. 단계에 없는 `questionId`는 그 질문의 답으로 붙이지 않고, 본문이 있으면 미연결로 저장한다. 지금은 그 입력을 건너뛴다.

`choiceId`가 없고 라벨만 있으면 저장은 `choiceId: null`이다. 라벨이 부모 선택지의 그 id와 다르면 `feedback_incomplete`다.

재분석 요청 JSON에 `unlinkedStatements`가 추가된다. 각 원소는 `feedbackId`, 원문, `submittedAt`, `source`다. 응답 모양은 기존 단계 JSON에 상태와 델타 유형이 더해지는 형태다. 시스템 문장을 아직 고치지 않으므로, 모델이 그 키를 빠뜨리면 검사는 실패 행을 저장한다. 그것이 첫 실측의 예상 결과일 수 있다. 실패를 성공으로 해석하지 않는다.

호출 횟수:

| 사건 | 호출 |
| --- | --- |
| 답 저장, 미연결 저장 | 0 |
| 열린 질문이 남은 단계 | 0 |
| 단계의 답이 모두 저장된 뒤 첫 재분석 | 1 |
| 같은 부모, 같은 답 조합의 재실행 | 0. 저장된 행 재사용 |
| 검사 실패 | 추가 호출 0 |
| 1차 같은 `inputSha`의 성공 행이 이미 있음 | 0. 기존 `runFirstReview` 재사용 |

## 6. 토큰과 비용

이번 설계 제출의 GPT 호출은 0회다. 비용은 0이다.

저장소 요율이다. 청구서가 아니다. `packages/ai/src/token/manager.ts`.

| 모델 | 입력 / 1M | 출력 / 1M |
| --- | --- | --- |
| `gpt-4o-mini` | 0.15 USD | 0.60 USD |
| `gpt-4o` | 2.50 USD | 10 USD |

#227 관측은 `gpt-4o` 2회, 합계 5,691 토큰, 저장소 요율 0.021915 USD다. 2차 요청은 prompt 974였다. 제품 단계 요청은 그 얇은 JSON보다 크다. 입력 상한은 24,000이다. 상한에 걸리면 오래된 `priorAnalyses`만 빠지고, 최초 원문, 이번 구간, 열린 질문, 미연결 문장, 최신 판단 이력은 남긴다. 빠진 id는 `omittedPriorReviewIds`에 적는다.

제품 상수 모델로 상한 근처 한 번을 호출해도 저장소 요율은 `gpt-4o` #227 한 번보다 작다. 정확한 다음 호출 토큰은 실행 전이라 적지 않는다. 모델 상수를 `gpt-4o`로 올리는 비용은 이 계획에 넣지 않는다.

## 7. 검증 시나리오

단위 테스트는 네트워크 없이 이 기대와 실패를 고정한다. 라이브 호출은 단위가 통과하고, CPO가 구현과 별도로 실호출을 허용한 뒤에 한 번이다. 같은 양조장 연습 문장을 쓰고, Founder 프로젝트 id는 쓰지 않는다.

| 시나리오 | 기대 | 실패하면 |
| --- | --- | --- |
| 최초 사업 입력 | 입력에 없는 문장이 `VERIFIED_FACT`로 저장되지 않음 | 수요·경쟁·지불자가 확인 사실 |
| 최초 질문 | 질문의 전제가 `UNKNOWN` 가정 | 긍정 판단을 확정 근거로 저장 |
| 정상 답변 | `questionId`와 출처가 있는 피드백. GPT 0회 | id 불일치 또는 저장 중 호출 |
| 질문 밖 정보 | 미연결 행. 질문은 `open`. GPT 0회 | `q1`이 `answered` |
| 미답 질문 | `UNKNOWN` | 긍정 또는 부정으로 기록 |
| 공급 계약 없음 | 실행 가능성 `DEFER`. 구간에 그 문장 | 협력 가능성 상승 |
| 가격 미정 | 수익 `UNKNOWN` | 가설 수수료를 확정 수익으로 유지 |
| 수요 근거 없음 | 수요 `UNKNOWN` | `충족` 또는 `충분` |
| 모순되는 답 | `MODIFY` 또는 `DEFER`와 근거 id | 이유 없는 `RETAIN` |
| 답 누적 | 이전 원문과 상태가 다음 요청에 있음. 새 목적이 다름 | 이전 답 누락 또는 같은 목적의 재질문 |
| 중복 요청 | 기존 행. 호출 0 | 추가 호출 |
| SIMULATION | `SIMULATION`. Founder 사실과 다른 배열 | `confirmedFacts` 또는 `FOUNDER_CLAIM` |

라이브 1회는 로컬 sqlite, 사용자 id는 연습용 새 id, 프로젝트 id는 Founder 프로젝트가 아닌 값이다. `AI_PM_SPRINT2_CONTINUITY=1`일 때만 켜지는 별도 테스트로 두고 `run-web-build.sh`에는 넣지 않는다. 실패하면 그 캡처를 새 파일로 남기고 재호출하지 않는다. #227 캡처를 그 파일로 덮지 않는다.

## 8. 단계

| 단계 | 내용 | 호출 | 멈추는 조건 |
| --- | --- | --- | --- |
| A | 검사 확장과 `choiceId` 보존, 미연결 저장. 단위 테스트 | 0 | 기존 판단 계약 단위 9건이 깨짐 |
| B | 제품 요청에 미연결 문장과 출처를 포함. 저장 전 검사. 시스템 문장은 유지 | 0 | 요청에서 최초 원문이나 열린 질문이 빠짐 |
| C | 승인된 뒤에만 연습 입력 라이브 1회. 제품 모델 상수 유지 | 1. 실패 시 추가 0 | 키 없음, 또는 직전 단계의 단위 실패 |
| D | C의 원문을 보고 시스템 문장을 바꿀지가 별도 승인 | 승인 전 0 | C를 통과했다고 보고 문장을 먼저 고침 |

A와 B가 이 설계 승인 후의 구현 범위다. C와 D는 그 구현이 저장된 뒤의 별도 승인이다.

## 9. 롤백과 Preview

롤백은 해당 커밋을 되돌리는 것이다. SQL 마이그레이션이 없으므로 스키마 롤백은 없다. 이미 저장된 실패 행은 삭제하지 않는다. 새 JSON 필드가 없는 옛 행은 읽기 경로가 그대로다.

Preview 배포는 A·B 단위가 통과한 뒤에도 이 계획의 기본 단계가 아니다. 빌드가 기존 라이브 테스트를 키게 되므로, 실호출은 로컬 연습 저장소에서만 한다. Production은 이 계획 밖에 있다.

## 10. 위험

| 위험 | 대응 |
| --- | --- |
| 시스템 문장을 그대로 두면 모델이 새 상태 키를 빠뜨려 1차가 실패 | 실패 행으로 남긴다. 프롬프트를 바로 고치지 않는다. D는 별도 승인 |
| `ai-pm-review.ts`가 커서 인접 동작이 깨짐 | 저장·조립·검사만 건드리고 기존 단계 단위를 함께 실행 |
| 미연결 입력이 기존 피드백과 섞임 | `unlinked: true`가 있을 때만 새 경로 |
| 24,000 토큰에서 오래된 분석이 빠짐 | 최초 원문, 이번 답, 열린 질문, 미연결 문장, 최신 판단은 삭제 대상이 아님. 빠진 id를 요청에 표시 |
| 검사 실패를 성공 화면이 질문으로 보여 줌 | 실패 행의 다음 질문은 비움 |
| Founder 데이터와 연습 데이터가 한 프로젝트에 모임 | 라이브는 별도 projectId. 출처 `simulation`은 `FOUNDER_CLAIM`으로 저장하지 않음 |
| #227 증거를 새 실행이 덮음 | 새 캡처는 다른 파일명. 기존 네 파일은 수정하지 않음 |
| 비용 | 설계 단계는 0. A·B도 0. C는 제품 모델 1회이며 상한 24,000 입력 |

## 11. 승인 전에 하지 않는 일

제품 코드 수정, 프롬프트 수정, GPT 호출, 새 실험 실행, DB 스키마 변경, Founder 데이터 변경, Production 배포, Sprint 3 착수, #227 실패 증거 덮어쓰기.

ADR은 이 설계가 승인되기 전에 추가하지 않는다.
