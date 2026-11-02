# Sprint 2 — 대화 연속성 구조

확인: 2026-11-03 08:58 KST

Sprint 2는 PARTIAL이다. 통합 재분석 요청의 필드 방향은 유지한다. 2026-11-03 08:58 KST에 비밀 주입 경로를 다시 읽었다. 이 프로세스의 시작 스냅샷에는 `GPT_API_KEY`가 없다. 같은 환경 버전에서 2026-11-02 19:13 KST에 시작한 프로세스는 그 이름을 받았다. 실행 중인 이 프로세스에 그 이름을 나중에 붙이는 경로는 없다. 이번 턴의 GPT 호출은 0회다. 4차는 NOT RUN이다. 상세는 `docs/evidence/ALABOM/AI-PM/SPRINT-2-GPT-SECRET-INJECTION.md`다. Founder 화면, Google 로그인, UI는 다루지 않았다. Production 배포는 하지 않았다. Sprint 3는 시작하지 않았다.

## 2026-11-03 08:42 KST 구현 기록

Sprint 2는 PARTIAL이다. 통합 재분석 요청에 답변 원문, 부족분, 현재 단계를 넣었다. 실제 GPT 3차와 4차는 이 프로세스에 `GPT_API_KEY`가 없어 호출하지 못했다. 이 프로세스의 시작 스냅샷에도 그 이름이 없다. 그 스냅샷은 라이브 대시보드 조회가 아니다.

## 이번 구현

`buildProductReanalysisRequest`의 stage 요청에 세 필드를 추가했다. 기존 필드와 파서는 유지했다. 질문 문장과 판단 문장은 넣지 않았다.

| 필드 | 내용 |
| --- | --- |
| `previousAnswers` | `questionKey`, 답 원문, `answerLevel`, `provenance`, `epistemicStatus` |
| `unresolvedGaps` | `verified`가 false인 답의 키와 아직 확인되지 않은 문장 |
| `currentStage` | `integrated_reanalysis` 또는 `answers_incomplete`, 이전 분석 수, 답변 수 |

`reported_result`와 `planned_action`은 말로 구분한다. 둘 다 `epistemicStatus`는 `FOUNDER_CLAIM`이고 `verified`는 false다. 실행했다고 적은 문장을 `VERIFIED_FACT`로 올리지 않는다.

테스트 `puts gap, stage, and founder-claim level on the integrated request`가 키 `parent-review:q1`, `parent-review:q2`와 두 수준, 부족분 2건, 단계 `integrated_reanalysis`를 확인했다. 같은 질문 문장을 다시 넣은 응답은 `stage_questions_repeated`이고 섹션은 null이다. `ai-pm-founder-context` 3, `ai-pm-e2e-continuity` 2, `ai-pm-continuity-contract` 5, `ai-pm-consulting-stage` 42, `ai-pm-strict-schema` 4가 통과했다. 네트워크 호출은 없다.

## 실제 GPT

이 프로세스의 주입 비밀은 `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`뿐이다. `GPT_API_KEY`는 없다. `OPENAI_API_KEY`로 대체하지 않았다. 3차와 4차 호출은 BLOCKED다. 4차는 성공한 3차가 없으므로 NOT RUN이다.

실패 증거 SHA-256 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`는 유지됐다. 성공 2차 `5f6d705d-fe2a-468f-97be-da16482abd32`와 실패 3차 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`은 수정하지 않았다.

## 판정

| 완료 조건 | 판정 |
| --- | --- |
| 최초 사업 아이디어 보존 | PASS |
| 이전 분석 이력 연결 | PASS |
| 질문·답변 출처 연결 | PASS |
| 추가 의견 보존 | PASS |
| 답변 상태 구분 | PASS |
| 통합 재분석 정상 동작 | BLOCKED |
| 질문 반복 방지 | PARTIAL |
| 부족분 후속 질문 생성 | BLOCKED |
| 답변에 따른 분석 갱신 | BLOCKED |
| 호출 통제 정상 동작 | PASS |
| 실제 GPT 3차 연속성 | BLOCKED |
| 실제 GPT 4차 연속성 | NOT RUN |
| 저장 및 재조회 | PASS |
| 실패 시 데이터 무결성 | PASS |

통합 재분석, 부족분 질문, 분석 갱신, 3차와 4차는 모델 응답이 있어야 PASS다. 이번 호출은 0회다.

구현 커밋은 `2bf059ab0e2139d176e5b932a6f354799afd37d6`다.

## 2026-11-03 08:22 KST 준비 기록

Sprint 2는 PARTIAL이다. 아래는 그 시점의 저장 요청 점검이다. Founder 화면, Google 로그인, UI는 다루지 않았다. GPT HTTP는 0회다. Production 배포는 하지 않았다. Sprint 3는 시작하지 않았다.

제품 모듈은 바꾸지 않았다. 기준은 PR #228, #229, #230, #231, #232다. 부모는 성공한 2차 `5f6d705d-fe2a-468f-97be-da16482abd32`다. 실패 3차 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`은 수정하거나 삭제하지 않았다. 증거 파일 SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다.

## 판정

| 완료 조건 | 판정 | 근거 |
| --- | --- | --- |
| 1. 최초 사업 아이디어 보존 | PASS | 2차·3차 요청의 `originalInput`은 186자다. 4차 요청은 없다 |
| 2. 전체 분석 이력 연결 | PASS | 2차 `priorAnalyses` 0, 3차 `priorAnalyses` 1. 실패 3차는 다음 부모가 아니다 |
| 3. 질문·답변 출처 연결 | PARTIAL | 저장 요청의 `answerLinks`는 `sourceReviewId`와 `questionId`를 가진다. 문자열 `questionKey`는 그 요청에 없다 |
| 4. 추가 의견 보존 | PASS | 2차·3차 `unlinkedStatements`는 1건이다 |
| 5. 답변 상태 구분 | PARTIAL | 저장 요청의 인식 상태는 `FOUNDER_CLAIM`이다. `answerLevel` 필드는 그 요청에 없다 |
| 6. 이전 의견의 통합 재분석 | PARTIAL | 2차는 저장됐다. 3차 응답은 저장 거절이라 다음 분석이 아니다 |
| 7. 기존 질문 반복 방지 | PARTIAL | 현재 파서는 저장된 3차 응답을 `sections: null`로 둔다. 반복하지 않은 성공 3차는 없다 |
| 8. 부족한 부분을 이어가는 후속 질문 | PARTIAL | 2차는 새 질문을 냈다. 3차는 같은 고객 조사 질문을 다시 냈고 저장되지 않았다 |
| 9. 새로운 답변에 따른 분석 갱신 | PARTIAL | 2차 판단은 저장됐다. 3차 판단은 적용되지 않았다 |
| 10. 통합 분석 호출 통제 | PASS | 완료된 회차당 호출 1회, 재시도 0회. 3차 실패 뒤 4차는 보내지 않았다 |
| 11. 4회차 대화 연속성 | NOT RUN | 성공한 3차가 없다 |
| 12. 데이터 저장 및 재조회 | PARTIAL | 이 4회 체인은 증거 JSON에 있다. 이 Supabase에는 실패 행 건수가 0이다 |
| 13. 실패 및 재시도 시 데이터 무결성 | PASS | 실패 행과 성공 2차 행의 상태가 그대로다. 파일 해시도 그대로다 |

13항이 모두 PASS가 아니므로 Sprint 2 PASS는 아니다.

## 기존 PR 대비 변경

제품 경로 `buildProductReanalysisRequest`, `judgeStageContract`, 화면, 인증은 이번 커밋에서 바꾸지 않았다. 추가된 것은 읽기 전용 점검과 이 보고서다.

| 파일 | 역할 |
| --- | --- |
| `apps/web/scripts/sprint2-conversation-continuity-final.test.ts` | 저장 요청 점검, 현재 스키마 점검, 실패 응답 재판정 |
| `apps/web/scripts/sprint2-conversation-continuity-final.config.ts` | 기본 테스트 목록 밖 |
| `docs/evidence/ALABOM/AI-PM/sprint-2-conversation-continuity-final.json` | 점검 수치 |
| `docs/evidence/ALABOM/AI-PM/SPRINT-2-CONVERSATION-CONTINUITY-FINAL.md` | 이 보고서 |

## Round 1–4

원문은 `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json`이다. 이번 점검은 그 파일을 읽기만 했다.

| 차수 | reviewId | 부모 | 상태 | 모델 | 토큰 prompt / completion / total | 응답 id |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `48d06eaa-ad74-4851-a919-fbd8ecefdc1a` | 없음 | succeeded | `gpt-4o-mini-2024-07-18` | 3,692 / 820 / 4,512 | `chatcmpl-EfbcrQpUVxRPscMIoGFW8XSp23wkN` |
| 2 | `5f6d705d-fe2a-468f-97be-da16482abd32` | 1차 | succeeded | `gpt-4o-mini-2024-07-18` | 15,761 / 1,121 / 16,882 | `chatcmpl-Efbcz1CJivX9bOCzdUXBBezft1rG2` |
| 3 | `0e75ff46-88fd-4ce2-b567-bdc3f3048531` | 2차 | failed | `gpt-4o-mini-2024-07-18` | 16,807 / 1,473 / 18,280 | `chatcmpl-Efbd9RroEWRZwQtaeBwxSkYw9Vm74` |
| 4 | 없음 | 없음 | NOT RUN | 없음 | 없음 | 없음 |

요청 모델은 `gpt-4o-mini`다. 호출은 3회, 재시도는 0회다. 저장 토큰 합은 39,674다. 이 숫자는 청구서가 아니다.

1차 사용자 본문은 JSON이 아니다. 2차 다음 질문은 `전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까?`다. 3차 저장 오류는 `stage_judgment_copied,stage_questions_repeated`다. 3차의 다음 질문 문장도 그 고객 조사 질문이다. 4차는 없다.

## 이전 의견이 다음 요청에 있는 증거

3차 요청에는 다음이 있다.

- `originalInput` 186자
- `firstAnalysis`, `latestAnalysis`
- `priorAnalyses` 1건
- `priorStagePairs` 1건, `stagePairs` 2건, 보충 문장 3건
- `closedQuestions` 3건, `priorQuestionTexts` 3건
- `unlinkedStatements` 1건
- `answerLinks`에서 만든 키 `48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1`, `5f6d705d-fe2a-468f-97be-da16482abd32:q1`, `5f6d705d-fe2a-468f-97be-da16482abd32:q2`
- `answerRecords`의 `epistemicStatus` 3건 모두 `FOUNDER_CLAIM`

그 요청 문자열에는 `questionKey`와 `answerLevel`이 없다. 현재 빌더가 격리 검증 요청에 그 두 필드를 넣는 증거는 PR #231의 `sprint-2-final-acceptance.json`에 있다. 그 요청은 양조장 2차의 재구성이 아니다.

저장된 3개 요청 객체에는 `responseFormat` 필드가 없다. 현재 `buildProductReanalysisRequest`는 stage 요청에 `stage_reanalysis` 스키마를 붙인다. 그 스키마의 strict 검사 이슈는 0이다. `nextQuestions` required는 `text`, `choices`, `verificationPurpose`, `reaskReason`이다. 출력 상한은 2,400토큰, 입력 예산은 24,000토큰이다.

## 질문 반복

저장된 3차 응답을 현재 `judgeStageContract`로 다시 읽었다. 네트워크 호출은 없다. 이슈는 `stage_questions_repeated`, `stage_objective_overlap`이고 `sections`는 null이다. 저장 행의 오류 문자열은 `stage_judgment_copied,stage_questions_repeated`다. 현재 파서는 그 응답에서 `stage_judgment_copied`를 내지 않고 `stage_objective_overlap`을 낸다. 저장 행은 바꾸지 않았다.

같은 문장의 반복과 같은 검증 목적의 반복은 이 응답에서 둘 다 걸렸다. 증거가 부족할 때 질문을 바꾸어 빈 증거를 묻는 성공 응답은 이 체인에 없다.

## 호출 통제와 합격 기준

승인 전 호출은 하지 않는다. 승인 후 순서는 다음이다.

1. 부모는 `5f6d705d-fe2a-468f-97be-da16482abd32`다. 실패 행은 부모가 아니다.
2. 3차만 1회 호출한다. 재시도는 0회다. 모델 상수는 `gpt-4o-mini`다. `openReviewChat`의 4회 상한으로 보내지 않는다.
3. 요청은 현재 `buildProductReanalysisRequest`가 만든다. 보낼 요청에 `originalInput`, `questionKey`, `answerLevel`, 미연결 의견, strict `responseFormat`이 있는지 호출 전에 남긴다.
4. 파서 이슈가 있으면 상태는 failed다. 부모와 기존 답변은 유지한다. 4차는 보내지 않는다.
5. 3차가 succeeded일 때만 4차를 1회 보낸다. 4차 요청의 질문 문장과 `verificationPurpose`는 1·2·3차에서 이미 답한 문장, 선택, 보충과 같으면 실패다.
6. 판단 문장을 특정 결론으로 고정하지 않는다. 유지와 변경 모두 허용한다. 질문 문장을 코드에 넣지 않는다.
7. Founder 사용자와 Founder 프로젝트에는 쓰지 않는다.

과거 3차 1회의 저장 토큰은 18,280이다. 승인 호출의 크기 기준은 그 회차다. 청구 단가는 이 기록에 없다.

## 테스트

`sprint2-conversation-continuity-final.test.ts` 1 passed. GPT HTTP 0. 증거 해시 유지. 실패 행 상태 `failed`. 2차 상태 `succeeded`. 스키마 이슈 0. 재판정 `sections` null.

## 검증 커밋

검증 커밋은 `2e0f570ce08be43eb24bb8e3fa81791d6607d455`다.
