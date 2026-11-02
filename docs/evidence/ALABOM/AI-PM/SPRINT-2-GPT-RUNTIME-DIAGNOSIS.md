# Sprint 2 — GPT 실행 위치 진단

2026-11-02 10:36 KST. 기준 커밋 `bc34fd9e`. 브랜치 `cursor/sprint2-continuity-architecture-4b88`.

조사만 했다. GPT 호출은 0회다. 제품 코드와 프롬프트는 바꾸지 않았다. Production은 배포하지 않았다. Founder 데이터는 읽거나 쓰지 않았다. Secret 값은 기록하지 않았다. Sprint 2 PASS는 선언하지 않는다.

## 판정

이번 BLOCKED의 확인된 원인은 **1. Cloud Agent 실행 프로세스에 `GPT_API_KEY`가 주입되지 않음**이다.

AI PM이 GPT를 호출하는 서버는 Supabase Edge Function이 아니다. 제품 화면의 서버는 Vercel에서 도는 Next.js Node 프로세스다. 이번 승인 검증이 멈춘 프로세스는 그 Vercel 서버가 아니라 이 Cloud Agent다. 두 프로세스는 같은 코드와 같은 환경변수 이름 `GPT_API_KEY`를 읽고, 비밀은 프로세스마다 따로 붙는다.

## A. 실제 호출 경로

제품 후속 경로의 코드 순서는 다음과 같다.

1. 화면 `apps/web/features/business-validation-journey/components/ai-pm-review-panel.tsx`가 `POST /api/ai-pm-review/follow-up`을 보낸다.
2. `apps/web/app/api/ai-pm-review/follow-up/route.ts`가 `readGptApiKey()`로 키를 읽고, 있으면 `openReviewChat()`을 `chat`으로 넘겨 `submitConsultingStage`를 호출한다. 이 파일의 `runtime`은 `nodejs`다.
3. `submitConsultingStage`는 `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`에서 답을 저장한 뒤 `runStageReanalysis`를 호출한다.
4. `runStageReanalysis`는 `finishCall`에 같은 `chat`을 넘긴다. `finishCall`은 `input.chat(input.request)` 한 번으로 모델에 보낸다.
5. `openReviewChat`은 `process.env.GPT_API_KEY`가 있을 때만 `OpenAIProviderAdapter`를 만든다. 없으면 `undefined`를 반환하고, 라우트는 `gpt_api_key_missing`으로 저장하며 모델을 호출하지 않는다.
6. `packages/ai/src/providers/adapters/index.ts`의 `OpenAIProviderAdapter.chat`이 `packages/ai/src/providers/openai-http.ts`의 `openAIChat`을 호출한다.
7. `openAIChat`은 `https://api.openai.com/v1/chat/completions`로 `fetch`한다. 헤더 이름은 `Authorization`이다. 키 값은 이 문서에 없다.

최초 분석은 같은 키 함수를 쓴다. `apps/web/app/api/ai-pm-review/route.ts`의 `POST`가 `runFirstReview`에 `openReviewChat()`을 넘긴다. 이 파일의 `runtime`도 `nodejs`다.

저장소의 `supabase/functions` 디렉터리와 `config.toml`은 없다. `Deno` 또는 `functions.invoke` 참조도 없다. `GET {SUPABASE_URL}/functions/v1/`는 404였다. 이 404는 배포된 함수 목록이 비었다는 증거가 아니다. 배포 목록을 읽는 관리 토큰이 이 프로세스에 없다.

Supabase가 이 경로에서 하는 일은 검토 행 저장이다. `openReviewBackend`는 `isSupabaseAdminConfigured()`가 참이면 Postgres 저장소를 연다. 그 함수는 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`를 본다. GPT 키를 읽지 않는다.

`apps/web/package.json`의 `build`는 `sh scripts/run-web-build.sh`다. Preview 빌드(`VERCEL_ENV=preview`, 브랜치가 `main`이 아님)는 그 스크립트 안에서 실 GPT 테스트를 같은 프로세스 환경으로 실행한다. 2026-11-01 10:48 KST Preview 기록 `docs/evidence/ALABOM/AI-PM/SPRINT-2-REAL-GPT-CONTINUITY.md`는 그 경로에서 `openReviewChat()`이 2회 호출됐음을 적는다. 그 기록은 오늘 Vercel 환경변수의 현재 상태가 아니다.

이 Cloud Agent의 `VERCEL_ENV`는 unset이다. 오늘 승인된 4회는 Vercel Preview 빌드가 아니라 이 프로세스에서 보내지기로 했고, 보내지 않았다.

## B. Secret 전달

| 환경 | 이름 존재 | 이 실행 프로세스 | 읽는 코드 |
| --- | --- | --- | --- |
| Cursor My Secrets | CPO가 존재 확인. 이 프로세스는 그 화면을 읽지 못함 | 주입 목록에 없음 | 제품 코드는 이 저장소를 직접 읽지 않음 |
| Cloud Agent 프로세스 | `CLOUD_AGENT_ALL_SECRET_NAMES`에 `GPT_API_KEY` 없음. `CLOUD_AGENT_INJECTED_SECRET_NAMES`에도 없음 | `process.env.GPT_API_KEY` MISSING | `readGptApiKey` |
| Supabase Project Secrets | 미확인. `SUPABASE_ACCESS_TOKEN` MISSING. 관리 API를 호출하지 않음 | 이 프로세스가 그 비밀을 GPT 호출에 쓰지 않음 | AI PM 호출 코드에 해당 참조 없음 |
| Supabase Edge Function Runtime | 저장소에 함수 소스 없음. 원격 함수 목록은 미확인 | 해당 런타임이 아님 | 해당 없음 |
| Vercel Node 런타임 | 미확인. `VERCEL_TOKEN` MISSING. 오늘 Production과 Preview 환경변수 화면을 열지 않음 | 이 프로세스가 아님. `VERCEL_ENV` unset | 같은 `readGptApiKey` |

`OPENAI_API_KEY`는 이 프로세스에서 MISSING이다. 대체 호출에 쓰지 않았다. `packages/ai/src/env/env.ts`와 `packages/core/src/env/env.ts`의 일반 클라이언트는 `OPENAI_API_KEY`를 읽는다. AI PM 상담 경로는 그 이름을 시작 조건으로 쓰지 않는다. `readGptApiKey` 주석과 `.env.example` 26행이 둘을 나눠 적는다. 상담 경로의 참조 이름은 `GPT_API_KEY`와 같다.

## C. 원인 분류

| 후보 | 판정 | 증거 |
| --- | --- | --- |
| 1. Cloud Agent에 Secret 미주입 | 이번 BLOCKED의 원인 | 이 프로세스 주입 목록과 `process.env.GPT_API_KEY` |
| 2. Supabase Project Secrets 미설정 | 원인으로 확정하지 않음. 상태 미확인 | 관리 토큰 없음. GPT 호출 코드가 그 저장소를 읽지 않음 |
| 3. Secret은 있으나 Edge Function에 안 넘어감 | 이 경로의 원인이 아님 | 상담 라우트 `runtime`은 `nodejs`. 저장소에 Edge Function 없음 |
| 4. 호출 함수가 예상과 다른 환경 | 제품 서버와 검증 프로세스는 다름 | 제품 서버는 Vercel Node. 오늘 멈춘 검증 프로세스는 Cloud Agent |
| 5. 환경변수 이름 불일치 | 상담 경로에서는 불일치 아님 | 라우트와 `readGptApiKey`가 `GPT_API_KEY` |
| 6. 기타 | 해당 없음 |  |

## D. 조치 분리

CPO 승인 전에는 해결을 실행하지 않는다. CEO가 지금 할 일은 없다. Secret을 지우거나 다시 등록하지 않는다.

원인 1이 맞을 때, 승인 이후의 분리는 다음과 같다.

- CEO: 기존 Cursor My Secrets의 이름 `GPT_API_KEY`가 검증을 실행할 Cloud Agent에 주입되는지만 확인한다. 값을 채팅이나 문서에 붙이지 않는다. Supabase 설정은 이 원인과 연결되어 있지 않다.
- CTO: 제품 코드와 프롬프트를 바꾸지 않는다. 주입된 프로세스에서 이름 PRESENT만 확인한 뒤, 승인된 4회를 그 프로세스에서 한 번 실행한다.
- 재실행 환경: `GPT_API_KEY`가 주입된 Cloud Agent 프로세스. Vercel 재배포나 Supabase Edge 재배포가 아니다.
- 비용과 Production: 이번 조사의 호출은 0회다. 이후 4회는 `gpt-4o-mini` 사용량만 생긴다. Production 배포는 하지 않는다. 검증 저장은 로컬 sqlite로 유지하고 Founder 프로젝트에는 쓰지 않는다.

## F. 조사 표

| 조사 항목 | 실제 확인 결과 | 증거 위치 | 조치 담당 |
| --- | --- | --- | --- |
| GPT 호출 함수 | `openAIChat`이 `https://api.openai.com/v1/chat/completions`로 전송 | `packages/ai/src/providers/openai-http.ts` | 변경 없음 |
| 실행 환경 | 제품 화면은 Vercel Node. 오늘 멈춘 4회는 Cloud Agent | `follow-up/route.ts`의 `runtime = 'nodejs'`. 이 프로세스 `VERCEL_ENV` unset | 검증은 Cloud Agent에서 재개 |
| Secret 참조 위치 | 상담은 `process.env.GPT_API_KEY`만 읽음 | `readGptApiKey` in `ai-pm-review.ts`. `.env.example` 26행 | 변경 없음 |
| Supabase Secret 상태 | 미확인. GPT 경로가 그 비밀을 읽지 않음 | `SUPABASE_ACCESS_TOKEN` MISSING. `openReviewBackend`는 DB 자격만 사용 | CEO 작업 없음 |
| Runtime 전달 상태 | Cloud Agent 주입 목록에 이름 없음. 프로세스 MISSING | `CLOUD_AGENT_ALL_SECRET_NAMES`, `CLOUD_AGENT_INJECTED_SECRET_NAMES` | 승인 후 CEO가 Cloud Agent 주입만 확인 |
| 실제 차단 원인 | Cloud Agent에 `GPT_API_KEY` 미주입 | 위 두 목록과 프로세스 환경 | CPO 승인 전 실행 없음 |
| 해결 방법 | 코드 수정 없이, 검증 프로세스에 기존 비밀 이름을 주입한 뒤 4회를 한 번 실행 | 이 문서 D절 | CEO는 주입 확인. CTO는 그 프로세스에서 1회 실행 |
