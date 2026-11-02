# Sprint 2 — 제품 경로 연속성 검증

확인: 2026-11-02 23:37 KST

Sprint 2는 PARTIAL이다. Production 배포는 하지 않았다. Supabase 행은 바꾸지 않았다. Sprint 3는 시작하지 않았다. GPT HTTP는 0회다. 4차는 NOT RUN이다.

이 검증은 새 기능을 넣지 않았다. 질문 생성 로직도 바꾸지 않았다. PR #228과 #229의 구현을 다시 설계하지 않았다. 확인한 것은 이미 있는 제품 함수가 격리된 데이터에서 저장, 재조회, 다음 요청 Payload를 잇는지다.

## 판정

sqlite 어댑터에서 함수가 맞게 동작한 항목은 PARTIAL이다. PASS로 두지 않는다. 설정된 제품 저장소는 Supabase이고, 그 저장소에는 쓰지 않았다.

| 완료 조건 | 판정 | 근거 |
| --- | --- | --- |
| 1. 최초 아이디어와 이전 의견 보존 | PARTIAL | 격리 sqlite에서 원문과 답 6건이 이후 회차 뒤에도 같은 id로 남음 |
| 2. 질문과 답변의 출처 연결 | PARTIAL | 다음 요청의 `questionKey`가 `sourceReviewId:questionId` |
| 3. 추가 의견 유실 없음 | PARTIAL | 미연결 문장이 저장되고 2회차 요청 `unlinkedStatements`에 남음 |
| 4. 답변 상태 구분 | PARTIAL | 다섯 수준이 갈라짐. 계획은 실행 결과가 아님. `verified`는 false |
| 5. 실제 저장 및 재조회 | BLOCKED | 제품 저장소는 Supabase. 쓰기는 이번 지시에서 금지. 행 수는 70, 32로 동일 |
| 6. 다음 분석 Payload | PARTIAL | 로컬 픽스처 콜백이 받은 사용자 JSON에 원문, 이전 판단, 이전 답, 미연결, 미확인이 있음. HTTP는 0 |
| 7. 같은 질문 반복 차단 | PARTIAL | 이미 물은 문장을 넣으면 `stage_questions_repeated`, `sections` null. 새 문장은 그 이슈가 없음 |
| 8. 단계 미완료 시 GPT 0회 | PARTIAL | 답 1건은 `pending: true`, `called: false`. 단계 채팅 콜백은 호출되지 않음. HTTP 0 |
| 9. 중복 재분석은 기존 결과 재사용 | PARTIAL | 같은 답을 다시 넣으면 `called: false`이고 기존 행 id를 반환 |
| 10. 기존 Founder 데이터와 실패 증거 | PASS | 증거 SHA-256 유지. Supabase 행 수 불변. 실패 행 id는 격리 파일에 없음 |

화면과 HTTP 라우트와 GPT 후속 호출과 4차는 NOT RUN이다.

## 검증한 경로

제품 함수는 `runFirstReview`, `submitConsultingStage`, `saveReviewFeedback`, `runStageReanalysis`, `buildProductReanalysisRequest`, `judgeStageContract`다. 저장 어댑터는 `openAiPmReviewStore`다.

`isSupabaseAdminConfigured()`는 true다. `openReviewBackend()`는 호출하지 않았다. 관리자 설정이 있으면 그 함수는 Supabase 저장소를 연다. 이번 환경의 제품 저장소 선택은 Supabase다.

HTTP는 호출하지 않았다.

| 라우트 | 연결 | 이번 검증 |
| --- | --- | --- |
| `POST /api/ai-pm-review` | `runFirstReview` | NOT RUN |
| `POST /api/ai-pm-review/feedback` | `saveReviewFeedback` | NOT RUN |
| `POST /api/ai-pm-review/follow-up` | `submitConsultingStage`. 키가 있으면 `openReviewChat()` | NOT RUN |
| `GET /api/ai-pm-review` | `presentReview` | NOT RUN |

후속 라우트는 키가 있으면 네트워크 채팅을 붙인다. 관리자 설정이 있으면 저장은 Production Supabase다. 둘 다 이번 지시 밖이라 라우트를 실행하지 않았다.

Supabase는 읽기만 했다. `ai_pm_reviews`와 `ai_pm_feedback`에 `select('*', { count: 'exact', head: true })`를 저장 전후로 보냈다. `record_json` 본문은 받지 않았다. insert, update, delete는 없다.

| 표 | 전 | 후 | 오류 |
| --- | --- | --- | --- |
| `ai_pm_reviews` | 70 | 70 | 없음 |
| `ai_pm_feedback` | 32 | 32 | 없음 |

호스트는 `zeccoskqmzedbmmrpmks.supabase.co`다. 서비스 롤 값은 기록하지 않았다.

## 테스트 데이터

사용자 `continuity-verify-user`. 프로젝트 `continuity-verify-project`. Founder 프로젝트 id와 사용자 id는 쓰지 않았다. 문장은 검증 스크립트 안의 격리 입력이다. 제품 코드의 질문 문장이 아니다.

| 행 | id | 부모 | 상태 | 저장 시각 (KST) |
| --- | --- | --- | --- | --- |
| 1차 | `2475d16d-1d10-4d8d-af4a-f88ea3edc7e7` | 없음 | succeeded | 23:20 |
| 2차 | `636329c1-fe4d-4ab2-9255-60e98b47304c` | 1차 | succeeded | 23:22 |
| 3차 | `b94fc70c-38ca-4146-94c3-71237d07eee9` | 2차 | succeeded | 23:26 |

저장 시각은 검증이 넣은 시계다. 실행 시각은 23:37 KST다.

증거 필드는 `injected_http`다. 모델 문자열은 `local-parser-fixture`다. 저장된 provider 열은 `openai`다. `ChatResponse`에 로컬 provider id가 없어 그렇게 남는다. 콜백은 프로세스 안에서 픽스처 문장을 돌려줬다. OpenAI HTTP는 0회다. 응답 id `local-parser-fixture`는 OpenAI 응답 id가 아니다.

이 검증 프로세스에는 `GPT_API_KEY`와 `GOOGLE_AI_API_KEY` 이름이 주입되어 있지 않다. 계정에 비밀이 없다고 보지 않는다. 호출하지 않았다.

## 저장 전후

1차 저장 전 피드백은 0건이다.

답 1건 저장 후:

| feedbackId | questionId | 문장 | modelCalls |
| --- | --- | --- | --- |
| `660b764f-775f-4c4e-9eef-ee04411e627c` | q1 | 직장인 | 0 |

파일을 닫고 같은 sqlite를 다시 연 뒤에도 이 1건이 남았다.

나머지 답을 넣은 뒤, 파일을 다시 닫았다 열고, 2차 답을 넣은 뒤의 1차 피드백은 아래 6건이다. id와 문장은 다시 열기 전과 같다. 2차 피드백은 다른 `reviewId`라 1차 행을 덮지 않는다.

| feedbackId | questionId | 연결 | 문장 | modelCalls |
| --- | --- | --- | --- | --- |
| `660b764f-775f-4c4e-9eef-ee04411e627c` | q1 | 선택 `직장인` | 직장인 | 0 |
| `5baa7352-8baa-4fdb-a7a3-4ecd33adc3c7` | q2 | 댓글 | 100명 대상으로 할 예정 | 0 |
| `bb3058d4-1279-4f36-96a8-d622eeb63072` | q3 | 댓글 | 안내를 실시했고 응답을 받았다 | 0 |
| `6fc4bf2c-7457-450d-82f2-b1bb1d84beff` | q4 | 댓글 | 실내에서 진행하는 구상이다 | 0 |
| `5347d1b2-6090-43ea-909a-ec8c4a211705` | q5 | 댓글 | 아직 정하지 못했다 | 0 |
| `ea0d964b-781f-497c-acc7-3382dd7e914f` | 없음 | unlinked | 질문과 연결되지 않은 추가 의견이다. 주말에는 열지 않는다. | 0 |

2차 피드백:

| feedbackId | questionId | 문장 | modelCalls |
| --- | --- | --- | --- |
| `bf1f96f0-f6c0-43e7-94c1-43e8d44e8900` | q1 | 지역 한 곳을 먼저 볼 계획이다 | 0 |
| `a1d773f9-0fdd-4786-9f19-cff75cc1f607` | q2 | 채널은 게시판을 염두에 두고 있다 | 0 |

1차 `inputText`는 세 행 모두 처음 문장 그대로다. 1차 `finishedAt`은 23:20 KST에서 바뀌지 않았다.

격리 sqlite는 검증 뒤 삭제했다. 위 id는 이 증거 파일에만 있다. Supabase 70행, 32행 안에는 없다.

## 재조회

`readReview`와 `listFeedback`를 저장소를 닫았다가 다시 열어 호출했다. 1차 원문, 판단 문장, 피드백 id 6개가 유지됐다. 2차 행의 부모는 1차 id다. 3차 행의 부모는 2차 id다.

## 다음 분석 Payload

전문은 `sprint-2-product-continuity-verification.json`의 `requests[1].user`와 `requests[2].user`다. 시스템 프롬프트는 `{ redacted: true, sha256, chars }`만 남겼다. 두 단계 요청의 스키마 제목은 `stage_reanalysis`이고 `nextQuestions.items.required`에 `reaskReason`이 있다.

2차 요청을 만들 때 콜백이 받은 사용자 JSON의 `answeredQuestionState`는 다음이다. `verified`와 `analysisComplete`는 모두 false다. 인식 상태는 `FOUNDER_CLAIM`이다.

| questionKey | 수준 | 해결 | 답 |
| --- | --- | --- | --- |
| `2475d16d-1d10-4d8d-af4a-f88ea3edc7e7:q1` | menu_choice | method_selected | 직장인 |
| `2475d16d-1d10-4d8d-af4a-f88ea3edc7e7:q2` | planned_action | plan_stated | 100명 대상으로 할 예정 |
| `2475d16d-1d10-4d8d-af4a-f88ea3edc7e7:q3` | reported_result | result_reported | 안내를 실시했고 응답을 받았다 |
| `2475d16d-1d10-4d8d-af4a-f88ea3edc7e7:q4` | stated_without_result | gap_named | 실내에서 진행하는 구상이다 |
| `2475d16d-1d10-4d8d-af4a-f88ea3edc7e7:q5` | unresolved_gap | still_open | 아직 정하지 못했다 |
| `636329c1-fe4d-4ab2-9255-60e98b47304c:q1` | planned_action | plan_stated | 지역 한 곳을 먼저 볼 계획이다 |
| `636329c1-fe4d-4ab2-9255-60e98b47304c:q2` | stated_without_result | gap_named | 채널은 게시판을 염두에 두고 있다 |

같은 `q1`이 회차 id로 갈라진다. `originalInput`은 최초 문장이다. 1차 판단 `수요가 확인되지 않아 판단을 유지한다. 이유는 지불 확인이 없기 때문이다.`가 요청 안에 있다. `unlinkedStatements`는 피드백 `ea0d964b-781f-497c-acc7-3382dd7e914f` 한 건이다. `priorStagePairs`는 5건, 이번 `stagePairs`는 2건, `stagePartial`은 false다.

`planned_action`의 미확인 문장은 실행 여부와 실제 결과가 이 답에 없다는 뜻이다. `reported_result`도 `FOUNDER_CLAIM`이고 `verified`는 false다.

## 호출 통제

채팅 콜백은 3회다. 모두 로컬 픽스처다. HTTP는 0회다.

| 시점 | called | pending | 콜백 횟수 |
| --- | --- | --- | --- |
| 1차 답 1건 | false | true | 1 (1차 픽스처만) |
| 1차 나머지 답 | true | false | 2 |
| 1차 같은 답 재전송 | false | false | 2. 반환 id `636329c1-fe4d-4ab2-9255-60e98b47304c` |
| 2차 답 1건 | false | true | 2 |
| 2차 나머지 답 | true | false | 3 |
| 2차 같은 답 재전송 | false | false | 3. 반환 id `b94fc70c-38ca-4146-94c3-71237d07eee9` |

이미 물은 `누가 이 공간을 쓰는가?`를 다음 질문으로 넣은 로컬 문장은 `stage_questions_repeated`이고 `sections`는 null이다. 같은 계약에 새 질문만 넣은 문장의 이슈는 빈 배열이다. 이 판정은 `judgeStageContract`이고 GPT 호출이 아니다.

## 미해결

1. 내구 저장과 재조회는 BLOCKED다. 이 환경의 제품 저장소는 Supabase다. 쓰기는 금지되어 있다. `user_id`는 `auth.users`를 가리키므로 격리 행을 넣으려면 Production 사용자도 만들어야 한다. 만들지 않았다. sqlite에서 본 동작은 그 저장소의 PASS가 아니다.
2. HTTP 라우트와 Founder 화면은 NOT RUN이다.
3. GPT가 이 Payload를 읽어 다음 질문을 만드는지는 NOT RUN이다. 그 호출은 이번 범위 밖이다.
4. 실패 3차 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`은 읽지도 고치지도 않았다. 4차 부모가 아니다. 4차는 NOT RUN이다.
5. Sprint 2 PASS는 아니다.

## 수정 파일

제품 모듈 `ai-pm-review.ts`는 바꾸지 않았다.

| 파일 | 역할 |
| --- | --- |
| `apps/web/scripts/sprint2-product-continuity-verify.test.ts` | 격리 검증. 기본 테스트 목록 밖 |
| `apps/web/scripts/sprint2-product-continuity-verify.config.ts` | 그 파일만 실행하는 설정 |
| `docs/evidence/ALABOM/AI-PM/sprint-2-product-continuity-verification.json` | 저장 스냅샷과 Payload |
| `docs/evidence/ALABOM/AI-PM/SPRINT-2-PRODUCT-CONTINUITY-VERIFICATION.md` | 이 보고서 |
| `docs/TASKS.md` | 상태 한 줄 |

커밋 SHA는 이 파일과 같은 커밋이다.

## Production과 Supabase

Production 배포 없음. Supabase 데이터 변경 없음. 행 수는 검증 전후 70과 32다. `sprint-2-e2e-live-gpt.json`의 SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다. Sprint 3는 시작하지 않았다.
