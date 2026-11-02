# Sprint 2 — GPT 비밀 주입 경로

**시각:** 2026-11-03 08:58 KST (`2026-11-02T23:58:19Z`)

**판정:** Sprint 2는 PARTIAL이다. 이번 턴의 GPT 호출은 0회다. 3차는 이 프로세스에서 준비만 하고 보내지 않았다. 4차는 NOT RUN이다. Production 배포는 하지 않았다. Sprint 3는 시작하지 않았다. 비밀 값은 출력하지 않았고 문서에 적지 않았다.

## 두 프로세스

같은 Personal 환경이다. 공개 id `316b619d-a743-11f1-a7d1-d6b4613131ce`. 버전 공개 id `3184f0c9-a743-11f1-a7d1-d6b4613131ce`. `environmentJsonPath`는 null이다. 저장소에 `.cursor/environment.json`은 없다. 성공한 빌드의 `environmentVersionId`는 `1154087`로 같다. egress는 제한이 없다.

| | 이번 프로세스 | 키가 있던 프로세스 |
| --- | --- | --- |
| id | `bc-e981acef-6442-4642-bef1-b0217b624b88` | `bc-089fd7eb-dd2b-5690-b7ba-dd5ccc56854d` |
| 시작 | 2026-10-14 11:30 KST | 2026-11-02 19:13 KST |
| 출처 | desktop | internal |
| 부팅 빌드 | `bld-20261025-b4665ae0-27b8-476e-aabf-2ee96bce1cd9` | `bld-20261028-3b73f7f9-9804-4207-bbd3-51f7e71bbb85` |
| 빌드 완료 | 2026-10-26 08:55 KST, RECURRING | 2026-10-28 09:59 KST, CONFIG_CHANGE |
| git setup | reuse, warm fork lazy_load | reuse_then_checkout, warm fork lazy_load |
| `GPT_API_KEY` | ABSENT | PRESENT (2026-11-02 19:20 KST 재확인) |

이번 프로세스의 `CLOUD_AGENT_ALL_SECRET_NAMES`와 `CLOUD_AGENT_INJECTED_SECRET_NAMES`는 같다.

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

키가 있던 프로세스의 두 목록도 서로 같았고, 위 다섯 이름에 `VERCEL_AUTOMATION_BYPASS_SECRET`, `GPT_API_KEY`가 더 있었다. 그 기록은 `docs/evidence/ALABOM/AI-PM/SPRINT-2-GPT-RUNTIME-RECHECK.md`다.

이 VM의 프로세스 환경을 다시 훑었다. `GPT_API_KEY` 이름을 가진 프로세스는 0개다. `OPENAI_API_KEY`와 `GOOGLE_AI_API_KEY`도 없다. 저장소와 홈의 env 파일에 그 이름은 없다.

최신 성공 빌드도 `bld-20261028-3b73f7f9-9804-4207-bbd3-51f7e71bbb85`다. 이번 VM은 그 빌드가 아니라 2026-10-26 08:55 KST 빌드에서 부팅한 상태를 유지한다.

## 주입 경로

상담 코드는 `readGptApiKey()`로 `process.env.GPT_API_KEY`만 읽는다. 계정 비밀 저장소를 직접 열지 않는다. `OPENAI_API_KEY`로 대체하지 않는다.

계정에 등록된 비밀은 Cursor Cloud Agents Secrets다. 우선순위는 에이전트 시작 시 넘긴 값, 환경 비밀, 개인 비밀, 팀 비밀이다. 사용자 비밀은 에이전트가 시작할 때 환경 변수로 붙고, 빌드 스냅샷에는 들어가지 않는다. 이미 떠 있는 에이전트는 시작 시점의 목록을 유지한다. 이후 등록은 다음에 시작하는 에이전트에 전달된다.

이 환경은 DB에 있는 Personal 설정이다. `environment.json`은 소유자 제한으로 이 프로세스에 노출되지 않는다. 비밀 값을 그 파일이나 커밋에 넣지 않았다.

exec-daemon의 `SyncScopedSecrets`는 제어면이 값을 밀어 넣는 경로다. 이 프로세스가 계정 저장소를 당겨 오는 호출은 없다. `CLOUD_AGENT_ALL_SECRET_NAMES`는 시작 때 받은 이름 스냅샷이다. 지금 대시보드를 다시 읽은 결과가 아니다.

2026-11-02 19:13 KST에 시작한 프로세스는 같은 환경 버전에서 `GPT_API_KEY`를 받았다. 그 이름으로 계정 비밀이 그 시작 시각에는 주입 대상이었다. 이번 프로세스는 2026-10-14 11:30 KST에 시작했고, 그 스냅샷에는 그 이름이 없다. 같은 환경 버전에서 빌드만 다른 것이 차이를 만들지 않는다. 차이는 프로세스 시작 시각의 비밀 스냅샷이다.

이 프로세스에는 사용자 API 키가 없어 `GET /v1/secrets`로 현재 대시보드 목록을 다시 읽지 못했다. 그래서 지금 계정 저장소에 이름이 없다고 쓰지 않는다. 있는 증거는 두 프로세스의 시작 스냅샷이다.

비밀을 다시 입력받는 `add_secrets` 요청은 보내지 않았다. 값을 채팅, 로그, 문서에 남기지 않았다.

## 3차 준비와 보류

승인된 3차의 부모는 성공한 2차 `5f6d705d-fe2a-468f-97be-da16482abd32`다. 실패 행 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`은 부모가 아니다. 호출은 `runStageReanalysis` 한 번, 재시도 0회, 모델 `gpt-4o-mini`다. `openReviewChat`의 4회 상한 경로는 쓰지 않는다. 요청은 현재 `buildProductReanalysisRequest`이고 `originalInput`, `questionKey`, `answerLevel`, `previousAnswers`, `unresolvedGaps`, `currentStage`, strict `responseFormat`을 가진 뒤에만 보낸다. 저장 상태가 succeeded가 아니면 4차는 보내지 않는다. Founder 사용자와 Founder 프로젝트에는 쓰지 않는다.

이 프로세스의 `readGptApiKey()`는 null이다. 요청은 만들지 않았고 네트워크로 나가지 않았다. 4차는 NOT RUN이다.

증거 `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json`의 SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다. 성공 1·2차와 실패 3차는 수정하지 않았다.

## 판정

| 항목 | 판정 |
| --- | --- |
| 컨텍스트 필드 방향 | 유지. 다시 설계하지 않음 |
| 이 프로세스에 `GPT_API_KEY` 전달 | 시작 스냅샷에 없음. 실행 중 갱신 경로 없음 |
| 3차 GPT | BLOCKED. 호출 0회 |
| 4차 GPT | NOT RUN |
| Sprint 2 | PARTIAL |
