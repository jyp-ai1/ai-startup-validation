# Sprint 2 — 최종 수용 검증

확인: 2026-11-02 23:55 KST

Sprint 2는 PARTIAL이다. 이번 결과로 PASS를 주지 않는다. Production 배포는 하지 않았다. Sprint 3는 시작하지 않았다. GPT HTTP는 0회다.

기준은 PR #228, #229, #230과 검증 커밋 `1204a8c23ae05792fe06741a20e8e8e5175f8d99`다. 제품 모듈 `ai-pm-review.ts`는 바꾸지 않았다.

## 판정

| 완료 조건 | 판정 | 근거 |
| --- | --- | --- |
| 1. Supabase 내구 저장 | PASS | `openReviewBackend()`가 Supabase를 선택했다. 격리 행을 넣고 다른 프로세스에서 같은 id로 읽었다 |
| 2. 재조회와 컨텍스트 복원 | PASS | 재조회 프로세스의 원문과 피드백 6건이 저장 직후와 같다 |
| 3. 질문·답변 출처 연결 | PASS | 피드백 `questionId`가 남고, 요청의 `questionKey`는 `sourceReviewId:questionId`다 |
| 4. 미연결 의견 보존 | PASS | 저장 의견과 HTTP로 추가한 의견이 격리 행에 남는다 |
| 5. 답변 상태 구분 | PASS | 다섯 수준이 갈라진다. 계획은 실행 결과가 아니다. `verified`는 false |
| 6. 중복 질문 차단 | PASS | 저장된 요청에 이미 물은 문장을 넣으면 `stage_questions_repeated`이고 `sections`는 null이다 |
| 7. 미완료 단계 GPT 0회 | PASS | 답 1건은 `pending: true`, `called: false`. 그 시점의 채팅 콜백은 늘지 않았다. HTTP 0 |
| 8. 중복 재분석 방지 | PASS | 같은 답의 재전송은 `called: false`다. HTTP도 `reused: true`다 |
| 9. HTTP API | PASS | 로컬 Next가 `GET /api/ai-pm-review`와 `POST /api/ai-pm-review/follow-up`을 Supabase 저장으로 응답했다 |
| 10. Founder 화면 | BLOCKED | 로그인 화면은 Google 로그인만 있다. 격리된 Google 세션이 없다. Founder 세션은 쓰지 않았다 |
| 11. GPT 실제 연속 분석 | NOT RUN | 신규 GPT HTTP는 승인 전이다. 이 프로세스와 로컬 서버 모두 호출하지 않았다 |
| 12. 전체 E2E | PARTIAL | 저장, 재조회, Payload, HTTP 저장까지다. 화면 재접속과 실제 GPT 재분석은 없다 |

1번부터 9번이 통과해도 Sprint 2 PASS가 아니다. 10번은 BLOCKED이고 11번은 NOT RUN이다.

## 저장소

`isSupabaseAdminConfigured()`는 true다. `openReviewBackend()`의 저장 보고는 `durable: true`, `productionDatabase: true`, `filePath: null`이다. sqlite로 대체하지 않았다.

호스트는 `zeccoskqmzedbmmrpmks.supabase.co`다. 서비스 롤 값은 기록하지 않았다.

| 대상 | 저장 전 | 저장 후 | HTTP 추가 후 |
| --- | --- | --- | --- |
| `ai_pm_reviews` 전체 | 71 | 74 | 프로젝트 목록 4건 유지 |
| `ai_pm_feedback` 전체 | 32 | 40 | 격리 사용자 8건에서 9건 |
| Founder 사용자 검토 | 70 | 70 | 70과 같음 |
| Founder 프로젝트 검토 | 68 | 68 | 비교 유지 |
| Founder 프로젝트 수 | 172 | 172 | 비교 유지 |
| 실패 행 `0e75ff46-88fd-4ce2-b567-bdc3f3048531` | 0 | 0 | 0 |

저장 전의 71은 Founder 70건과, 첫 시도에서 남은 격리 실패 1건이다. 그 실패 행은 `c7681fa3-410e-4eab-bdef-069bcaf8be6d`다. 1차 프롬프트 본문이 JSON이 아니라 로컬 콜백이 파싱 전에 예외를 냈고, 제품 함수가 그 오류를 격리 사용자 행에 저장했다. Founder 행이 아니다. 지우지 않았다. 이어서 같은 격리 사용자로 성공 행을 넣었다.

실패 증거 `sprint-2-e2e-live-gpt.json`의 SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다. 이 Supabase에는 그 실패 행이 없다.

## 격리 데이터

사용자 `c0ffee00-1111-4000-8000-0000000002a2`. 메일 `sprint2-final-acceptance@example.invalid`. 프로젝트 `bc12a6f4-45b7-47b2-b266-ef61cd4013d9`, 제목 `SPRINT2 ISOLATED ACCEPTANCE`. Founder 사용자 `37d541c8-fda7-4788-8ac2-1a449b00425c`와 프로젝트 `3a5fc4a0-2e90-45e6-8370-350beda67342`와 다르다.

비밀번호는 기록하지 않았다.

| 행 | id | 부모 | 상태 |
| --- | --- | --- | --- |
| 첫 시도 | `c7681fa3-410e-4eab-bdef-069bcaf8be6d` | 없음 | failed |
| 1차 | `9d49d73d-1bdb-43f8-aa5f-22f0138813d9` | 없음 | succeeded |
| 2차 | `69878cc7-05f0-4980-bb37-011c6f7cf302` | 1차 | succeeded |
| 3차 | `818cc1e2-3324-43dc-a548-e2c01b72e1db` | 2차 | succeeded |

분석 문장은 로컬 픽스처다. 증거 필드는 `injected_http`다. 모델 문자열은 `local-parser-fixture`다. 저장된 provider 열은 타입 때문에 `openai`이고, OpenAI HTTP는 0회다.

1차 피드백은 프로세스를 끝낸 뒤 다른 프로세스의 `readReview`와 `listFeedback`에서 같은 id로 읽혔다.

| feedbackId | questionId | 문장 |
| --- | --- | --- |
| `b6834bdc-2060-4207-95e7-544ee51acc1c` | q1 | 직장인 |
| `084969b5-5015-4ab9-9cb5-5b79c0799dde` | q2 | 100명 대상으로 할 예정 |
| `e7866ee3-2182-4d17-b743-42250ebcf057` | q3 | 안내를 실시했고 응답을 받았다 |
| `5b287941-7710-4c21-a649-3608ddc3fef1` | q4 | 실내에서 진행하는 구상이다 |
| `d0b1e51d-7aec-42da-97f6-94910cb5d6fe` | q5 | 아직 정하지 못했다 |
| `63770084-963d-46f7-9ebc-da4131afd564` | 없음, unlinked | 질문과 연결되지 않은 추가 의견이다. 주말에는 열지 않는다. |

2차 피드백은 `7501d005-7423-4103-902b-dee5b4519588`과 `609020fa-808a-404c-929a-edcc0d98df59`다. 1차 원문과 `finishedAt` 23:40 KST는 그대로다.

## 다음 요청 Payload

전문은 `sprint-2-final-acceptance.json`의 `requests`다. 시스템 프롬프트는 해시와 길이만 남겼다. 2차 요청의 `answeredQuestionState`는 다음이다. `verified`는 false다.

| questionKey | 수준 | 해결 |
| --- | --- | --- |
| `9d49d73d-1bdb-43f8-aa5f-22f0138813d9:q1` | menu_choice | method_selected |
| `9d49d73d-1bdb-43f8-aa5f-22f0138813d9:q2` | planned_action | plan_stated |
| `9d49d73d-1bdb-43f8-aa5f-22f0138813d9:q3` | reported_result | result_reported |
| `9d49d73d-1bdb-43f8-aa5f-22f0138813d9:q4` | stated_without_result | gap_named |
| `9d49d73d-1bdb-43f8-aa5f-22f0138813d9:q5` | unresolved_gap | still_open |
| `69878cc7-05f0-4980-bb37-011c6f7cf302:q1` | planned_action | plan_stated |
| `69878cc7-05f0-4980-bb37-011c6f7cf302:q2` | stated_without_result | gap_named |

`originalInput`은 최초 문장이다. 미연결 피드백 id는 `63770084-963d-46f7-9ebc-da4131afd564`다. `reaskReason`은 `stage_reanalysis` required에 있다.

이미 물은 `누가 이 공간을 쓰는가?`를 넣은 판정은 `stage_questions_repeated` 하나이고 `sections`는 null이다. 새 질문만 넣은 판정의 이슈는 빈 배열이다. 이 판정은 GPT 응답이 아니다.

답 1건 저장 때는 `called: false`, `pending: true`였다. 채팅 콜백은 1차 픽스처 1회에서 멈추었다. 같은 답을 다시 넣으면 2차 행 `69878cc7-05f0-4980-bb37-011c6f7cf302`를 반환하고 콜백은 늘지 않았다.

## HTTP

로컬 서버는 `http://127.0.0.1:3456`이다. 그 프로세스 환경에는 `GPT_API_KEY` 이름을 넣지 않았다. 계정 비밀은 지우지 않았다.

격리 사용자로 서명하고 쿠키를 붙였다. 쿠키 값과 비밀번호는 기록하지 않았다.

| 호출 | 상태 | 결과 |
| --- | --- | --- |
| `GET /api/ai-pm-review?projectId=bc12a6f4-45b7-47b2-b266-ef61cd4013d9` | 200 | 검토 4건. `storage.kind`는 supabase, `durable`과 `productionDatabase`는 true |
| `POST /api/ai-pm-review/follow-up` 같은 답 | 200 | `called: false`, `pending: false`, `reused: true` |
| `POST /api/ai-pm-review/follow-up` 새 미연결 의견 | 400 | `gpt_api_key_missing`. 행은 저장됨 |
| 같은 GET | 200 | 검토 4건 |

새 미연결 문장 `HTTP 경로에서 추가한 분리 의견이다.`는 1차 검토의 피드백으로 다시 읽혔다. 격리 피드백은 8건에서 9건이 됐다. Founder 검토 수는 바뀌지 않았다. 서버 로그에 OpenAI 호스트는 없다.

## Founder 화면

`apps/web/features/auth/components/login-panel.tsx`는 Google 로그인 버튼만 둔다. 이 환경에는 격리된 Google 세션 파일이 없다. Founder Google 세션으로 화면을 열지 않았다. 새로고침과 재접속 후의 화면 유지는 BLOCKED다.

## GPT

신규 GPT HTTP는 하지 않았다. 이 프로세스의 `GPT_API_KEY` 이름은 주입되어 있지 않다. 계정에 비밀이 없다고 보지 않는다. 로컬 서버는 그 이름을 빼고 띄웠고, 완료된 단계의 추가 의견은 `gpt_api_key_missing`으로 끝났다. 실제 모델이 이전 의견을 읽고 다음 질문을 잇는지는 NOT RUN이다.

## 수정 파일

| 파일 | 역할 |
| --- | --- |
| `apps/web/scripts/sprint2-final-acceptance.test.ts` | Supabase 저장, 재조회 프로세스, HTTP |
| `apps/web/scripts/sprint2-final-acceptance.config.ts` | 기본 테스트 목록 밖 |
| `docs/evidence/ALABOM/AI-PM/sprint-2-final-acceptance.json` | id, Payload, HTTP 결과 |
| `docs/evidence/ALABOM/AI-PM/SPRINT-2-FINAL-ACCEPTANCE-REPORT.md` | 이 보고서 |
| `docs/TASKS.md` | 상태 한 줄 |

검증 커밋 SHA는 이 보고서를 넣은 커밋과 같다.

## Production

배포하지 않았다. Founder 검토 70건, Founder 프로젝트 172건, 실패 행 건수 0은 유지됐다. 추가된 행은 격리 사용자 `c0ffee00-1111-4000-8000-0000000002a2`와 프로젝트 `bc12a6f4-45b7-47b2-b266-ef61cd4013d9`뿐이다. Sprint 2 PASS는 아니다. Sprint 3는 시작하지 않았다.
