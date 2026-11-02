# Sprint 2 — Structured Output 복구

확인: 2026-11-02 19:46 KST

Sprint 2는 PARTIAL이다. Production은 잠금이다. Sprint 3은 시작하지 않는다. 이번 구간의 GPT 호출은 0회다.

기준은 구현 `267d23b2`와 미전송 기록 `11bc5208`이다. 직전 재확인 프로세스는 `bc-089fd7eb-dd2b-5690-b7ba-dd5ccc56854d`이고, 그 1회는 HTTP 400으로 completion 전에 끝났다. 응답 id는 없다.

## P0. 스키마

`stage_reanalysis`의 `nextQuestions.items`에서 `reaskReason`은 properties에만 있고 required에는 없었다. OpenAI strict `json_schema`는 그 객체를 거부했다.

지금 required는 `text`, `choices`, `verificationPurpose`, `reaskReason`이다. `reaskReason`의 타입은 `["string", "null"]`이다. 새 질문이면 값은 null이고 키는 남는다. null과 빈 문자열은 파서에서 사유 없음으로 읽는다. 문자열이 있으면 그 문장을 사유로 남긴다. 같은 질문 문장은 사유가 있어도 실패다.

같은 규칙으로 검사한 strict 스키마는 다음이다.

| 스키마 | properties와 required |
| --- | --- |
| `stage_reanalysis` | 일치. 이번 수정 대상 |
| `product_reanalysis` | 일치. 변경 없음 |
| `reflection_output_11` | 일치. 변경 없음 |
| `experiment_b_state` | 일치. 변경 없음 |
| `experiment_b_selection` | 일치. 변경 없음 |
| `decision_contract_state` | 일치. 변경 없음 |
| `decision_contract_selection` | 일치. 변경 없음 |

다른 스키마에서 required에 빠진 property는 없었다.

## P1. 테스트

네트워크 호출은 없다. `*.live.test.ts`는 실행하지 않았다.

| 파일 | 결과 |
| --- | --- |
| `ai-pm-strict-schema.test.ts` | 4 passed |
| `ai-pm-consulting-stage.test.ts` | 42 passed |
| `ai-pm-founder-context.test.ts` | 2 passed |
| `ai-pm-e2e-continuity.test.ts` | 2 passed |
| `ai-pm-continuity-contract.test.ts` | 5 passed |
| `ai-pm-review.test.ts` | 77 passed |
| `ai-pm-decision-contract.test.ts` | 9 passed |
| `ai-pm-experiment-b.test.ts` | 9 passed |

합계 150 passed, 0 failed.

확인한 계약:

1. strict 객체의 모든 property가 required에 있다.
2. `reaskReason` null과 문자열은 저장된 2차 원문 `chatcmpl-Efbcz1CJivX9bOCzdUXBBezft1rG2`에서 같은 파서 이슈를 유지한다. null은 사유 필드가 없다.
3. `설문조사 실시`만 있으면 `menu_choice`다.
4. `100명 대상으로 할 예정`은 `planned_action`이다. `실시하고 … 응답함`은 `reported_result`이고 `FOUNDER_CLAIM`이다. `verified`는 false다.
5. 질문 키와 `sourceReviewId` 보존은 기존 단계 테스트가 유지한다.
6. 같은 질문과 같은 목적 중복은 `stage_questions_repeated`와 `stage_objective_overlap`으로 남는다.
7. 같은 판단 문장만으로 `stage_judgment_copied`가 되지 않는다.
8. 실패 행 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`과 `sprint-2-e2e-live-gpt.json`은 바꾸지 않았다. SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다.
9. 토큰 예산을 넘는 이전 분석 요약이 빠져도 최초 입력, 유지 판단, 해결 근거, 미해결 위험, 답변 문장은 `ai-pm-founder-context.test.ts`에서 남는다.

이 검증은 OpenAI에 다시 보내지 않았다. 400을 만든 required 불일치는 스키마에서 없어졌다. 실제 HTTP 200은 아직 없다.

## P2. 호출 준비

부모는 성공한 2차 `5f6d705d-fe2a-468f-97be-da16482abd32`다. 제품 요청은 `buildProductReanalysisRequest`가 `stagePairs`가 있을 때 `stageReanalysisSchema()`를 `responseFormat`으로 붙인다. 그 스키마의 strict 검사 이슈는 빈 배열이다.

GPT 호출은 0회다. 재시도는 0회다. 4차는 NOT RUN이다. 새 3차 completion은 CPO의 별도 승인 전이다.

## P3. 제품 경로

제품 저장소와 화면 검증은 하지 않았다. 임시 sqlite 통과로 대체하지 않는다.

| 경로 | 코드 | 이번 검증 |
| --- | --- | --- |
| 후속 API | `POST /api/ai-pm-review/follow-up`, `runtime` `nodejs` | NOT RUN |
| 저장 선택 | `chooseReviewBackend`. 관리자 설정이 있으면 Supabase, 없으면 로컬 sqlite | 제품 저장소 NOT RUN |
| 재조회 | 저장소 `readReview` | 제품 저장소 NOT RUN |
| 화면 | `ai-pm-review-panel.tsx`가 같은 경로로 전송 | 브라우저 NOT RUN |
| 답변 저장 | `submitConsultingStage`가 답을 저장한 뒤 재분석 | Founder 데이터 NOT RUN |
| 중복 호출 | 같은 부모와 같은 supplement면 `called: false` | 단위 테스트만. 제품 저장소 아님 |
| 4차 부모 | 실패 행은 `review_missing` | 새 3차 성공 행 없음. 4차 NOT RUN |

단계 재분석의 `finishCall`은 채팅을 한 번 호출하고 수리 루프를 돌지 않는다. 화면이 쓰는 `openReviewChat`은 할당량 오류에서 추가 호출을 허용한다. 다음 승인 호출은 그 함수 대신 1회 어댑터를 쓴다. 이번 구간에서 그 경로를 바꾸지 않았다.

## 잠금

Production 배포 없음. Founder 프로젝트 변경 없음. Supabase 호출 없음. 실패 3차 행 변경 없음. 실패했던 로컬 재확인 행 `e229ba92-1ded-4a18-841d-6de86ac869c3`도 제품 저장소에 없다. Sprint 2 PASS는 선언하지 않는다.
