# CPO 검토 패키지 — ALABOM AI PM 비교 검증

판정: **BLOCKED**

2026-10-28 10:02 KST. 새 VM에서 `VERCEL_AUTOMATION_BYPASS_SECRET`은 있었고 길이는 32였다. 값은 적지 않는다. Preview `/api/build-info`는 앱 JSON HTTP 200이었고, SHA는 응답 `data.commit`에서 읽었다. `/api/ai-pm-review`는 앱 HTTP 401 `login_required`였다. 모델 호출은 없었다. 리뷰 id는 없다. Supabase 저장·재조회와 화면 일치는 실패다. CPO 독립 검토와 CEO 최종 검토는 요청하지 않는다. Production 잠금 `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`와 PR #207 미병합은 유지했다. 배포와 Deployment Protection은 바꾸지 않았다. Production 호스트는 호출하지 않았다.

이번 판정의 근거는 8절이다. 1~7절은 그 이전 실행 기록이다.

2026-10-28 08:42 KST. 비교 분석은 시작하지 않았다. 모델 호출은 0건이다. 인증 없는 Preview 재요청은 하지 않았다. CEO 최종 확인은 요청하지 않는다. Production 잠금 `0b465226`과 PR #207 미병합은 유지했다.

세 의존성을 따로 기록한다. 원문이 디스크에 있어도, Preview 인증이 되어도, `GPT_API_KEY`가 없으면 검증은 시작되지 않는다.

| 확인 | 시각 | 결과 |
|---|---|---|
| `GPT_API_KEY`, `VERCEL_TOKEN` | 08:30 KST | 이 런에 없음 |
| Chrome의 Vercel 쿠키 11개로 `/api/build-info` 1회 | 08:30 KST | 로그인 화면. 앱 SHA 없음. 인증 세션이 아니다 |
| `ai_pm_reviews` | 08:30 KST | HTTP 200, `content-range */0` |
| `knowledge_documents`에서 Gemini, GPT, 양조 검색 | 08:30 KST | 0건 |
| 다른 데스크톱 실행 런 | 08:30 KST | ALABOM2, ALABOM3에는 이번 비교 원문이 없다 |
| 08:40 KST 메시지 원문 저장 | 08:42 KST | 파일 3개. Gemini 파일은 사업 입력과 동일. 모델 미전달 |
| `GPT_API_KEY`, Vercel 자격 | 08:42 KST | 여전히 없음. Preview 비인증 재요청 없음 |
| 자동화 우회 비밀의 실행 환경 주입 | 09:20 KST | 이 런의 주입 목록에 없음. 설정 화면은 로그인으로 이동. `/api/build-info` 요청 없음 |

전체 경로(모델 호출 → 비교 분석 → 저장 → 재조회 → 화면 일치)는 시작 전에 끊겨 있다. `c22ffacb`는 화면 커밋이며 이 경로의 증거가 아니다.

## 1. 대상

| 항목 | 값 |
|---|---|
| 프로젝트 | 주인집11 |
| 프로젝트 ID | `e719bc33-e35b-40d9-9494-167e603a338e` |
| 프로젝트 갱신 | 2026-10-28 08:09 KST |
| 코드 기준 SHA | `19e8fccaed596540979de134bf6e32a981fa3586` |
| 그 SHA의 Preview | `https://ai-startup-validation-qrexjkphr-jyp-ai1s-projects.vercel.app` |
| 앱에서 읽은 SHA | 없음. 2026-10-28 05:05 KST `/api/build-info`는 HTTP 401. 이 SHA가 검증됐다고 기록하지 않는다. |
| `ai_pm_reviews` | 2026-10-28 08:14 KST 기준 HTTP 200, `content-range */0`, 행 0 |

주인집11에 저장된 사업 요약:

> 다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.

`problem`, `solution`, `target_customer`, `business_model`은 비어 있다. `business_plans`, `validation_reports`, `ai_report_generations`, `project_context`, `knowledge_documents`는 이 프로젝트에 0건이다.

## 2. 비교 기준

2026-10-28 08:40 KST 메시지에서 받은 글을 이 런의 파일로 저장했다. 모델 입력으로 보내지 않았다. 비교 분석 성공으로 기록하지 않는다.

| 파일 | SHA-256 | 바이트 | 내용 |
|---|---|---|---|
| `docs/evidence/ALABOM/AI-PM/comparison-sources/juinjip11-input.txt` | `a5518b64db335d57d771cd0a3f4d5a3e4185b375e6778d10db67bbc0a7e559df` | 457 | 사업 입력 한 단락 |
| `docs/evidence/ALABOM/AI-PM/comparison-sources/gemini-supplied.txt` | `a5518b64db335d57d771cd0a3f4d5a3e4185b375e6778d10db67bbc0a7e559df` | 457 | 위 파일과 바이트 단위로 같다. 독립된 Gemini 검토가 아니다 |
| `docs/evidence/ALABOM/AI-PM/comparison-sources/gpt-supplied.md` | `16e04fbf3a0b2131052142f4a0930ec67b088305cae52d002def1ad59ec6f3ba` | 17494 | 제목 `전통주 양조장 체험 플랫폼 사업성 검토`부터 `구체화할 수 있습니다.`까지. 그 뒤의 CPO 지시문은 넣지 않았다 |

`gemini-supplied.txt`와 `juinjip11-input.txt`의 SHA-256이 같다. “1. 제미나이” 칸에 적힌 글은 사업 설명을 한 번 더 붙인 것이다. 두 답변의 공통점과 차이를 비교할 두 번째 검토문이 아니다. GPT 원문에 있는 5만원, 15%, 월 500명, 월 30만원, 월 675만원, 50~100건은 그 글이 가정이라고 적은 숫자이며, 측정값으로 쓰지 않는다.

현재 첫 검토 요청(`buildFirstReviewRequest`)은 사업 문장과 JSON 키만 보낸다. 외부 검토문을 넣는 칸이 없다. 키와 인증이 없는 상태에서 그 칸을 만들지 않았다. 나중에 그 변경이 생기면 새 SHA이며, 이 패키지의 검증 대상이 아니다.

| 항목 | GPT 원문 | Gemini로 표시된 글 | AI PM | 판정 |
|---|---|---|---|---|
| 사업 기회와 고객 가치 | 파일에 있음. 모델에 보내지 않음 | 사업 입력과 동일. 별도 검토 없음 | 모델 호출 없음 | **BLOCKED** |
| 우선 공략 고객 | 파일에 있음. 모델에 보내지 않음 | 별도 검토 없음 | 모델 호출 없음 | **BLOCKED** |
| 경쟁과 차별화 | 파일에 있음. 모델에 보내지 않음 | 별도 검토 없음 | 모델 호출 없음 | **BLOCKED** |
| 수익 모델 | 파일에 있음. 가정 수치. 모델에 보내지 않음 | 별도 검토 없음 | 모델 호출 없음 | **BLOCKED** |
| 위험과 실행 | 파일에 있음. 모델에 보내지 않음 | 별도 검토 없음 | 모델 호출 없음 | **BLOCKED** |
| 초기 검증 계획 | 파일에 있음. 모델에 보내지 않음 | 별도 검토 없음 | 모델 호출 없음 | **BLOCKED** |
| 사업성 판단과 바꿀 증거 | 파일에 있음. 모델에 보내지 않음 | 별도 검토 없음 | 모델 호출 없음 | **BLOCKED** |
| 후속 질문 | 파일에 있음. 모델에 보내지 않음 | 별도 검토 없음 | 고정 규칙 질문만 코드에 있음 | **BLOCKED** |

전달 경로: 디스크 저장까지. 모델 전달 없음.

## 3. 독립 판단 검증

| 항목 | 판정 | 근거 |
|---|---|---|
| 사업 이해 | **BLOCKED** | 실제 모델 응답 없음 |
| 근거 품질 | **BLOCKED** | 실제 모델 응답 없음 |
| 사업성 결론 | **BLOCKED** | 규칙 엔진 문장을 모델 결론으로 쓰지 않음 |
| 비교 분석 | **BLOCKED** | 원문 파일은 있다. 모델에 보내지 않았다. Gemini 칸은 독립 검토가 아니다 |
| 다음 질문 | **FAILED** | 현재 화면의 질문은 `present-si-ai-pm-question.ts` 고정 문구다 |
| 질문 출처 | **PASS** | 규칙 질문은 `data-question-source="rule"`. 모델 질문은 `model-review`일 때만 표시. 둘을 성공으로 섞지 않음 |
| 데이터 일관성 | **BLOCKED** | 저장할 모델 결과가 없음 |
| 후속 대화 | **BLOCKED** | 모델 질문 제출을 실행하지 않음 |

## 4. 화면

CEO가 본 화면은 성공이 아니다. 고정 질문이 앞에 있고, 사업 요약·근거·미확인 항목이 한 화면에 반복된다.

이번 코드는 그 화면의 순서를 바꾼다. 결론, 불확실성, 결론을 바꿀 증거, 검증 한 가지를 먼저 두고 나머지 근거는 `상세 근거 보기` 안에 넣는다. 확인 질문의 제목은 `규칙으로 고른 확인 질문`이고, 모델이 만든 질문이 아니라고 적는다. 이 변경은 인증된 Preview에서 주인집11로 다시 보지 못했다. 그래서 화면 통과로 기록하지 않는다.

모델 검토 패널도 결론과 불확실성을 먼저 보여주고, 나머지 항목은 상세 안에 둔다. 그 패널에 표시할 실제 모델 응답은 없다.

## 5. 호출 증거

- 확인 시각: 2026-10-28 08:42 KST
- 요청 시각: 없음
- 모델명: 없음
- 응답 상태: 호출하지 않음. `GPT_API_KEY`와 `OPENAI_API_KEY` 모두 이 프로세스에 없음. `OPENAI_API_KEY`로 대체하지 않음
- `nextQuestion`: 없음
- 리뷰 ID: 없음
- `ai_pm_reviews`: 08:30 KST에 0행. 호출이 없어 08:42 KST에 다시 조회하지 않음

## 6. 의존성 세 개

| # | 의존성 | 08:42 KST | 원인 | 필요한 권한 |
|---|---|---|---|---|
| 1 | 비교 원문을 이 런에서 읽기 | 부분 | GPT 원문은 `gpt-supplied.md`에 있다. Gemini로 적힌 파일은 사업 입력과 같다 | 독립된 Gemini 검토 원문. 이 런이 그 글을 파일로 읽을 수 있어야 한다. 사업 설명을 다시 붙인 글은 그 원문이 아니다 |
| 2 | 인증된 Preview의 `/api/build-info` | 막힘 | 2026-10-28 09:20 KST. 이 런에 주입된 비밀 이름은 `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`뿐이다. `VERCEL_AUTOMATION_BYPASS_SECRET`은 그 목록에 없다. Vercel 설정 주소는 `/login`으로 끝난다. 헤더 `x-vercel-protection-bypass`를 붙일 값이 없어 요청을 보내지 않았다 | 비밀값을 이 대화에 붙이지 않는다. Cursor Cloud Agent 환경 `316b619d-a743-11f1-a7d1-d6b4613131ce`의 비밀 저장소에 `VERCEL_AUTOMATION_BYPASS_SECRET`이라는 이름으로 넣는다. 이미 떠 있는 이 런은 새 비밀을 받지 않으므로, 저장 뒤 새 실행이 필요하다. Vercel 화면에서는 그 비밀을 시스템 환경변수 `VERCEL_AUTOMATION_BYPASS_SECRET`으로 지정한 뒤 Preview를 다시 배포한다. 그 다음에만 새 실행이 헤더로 `/api/build-info`를 읽는다. Production 보호는 바꾸지 않는다 |
| 3 | 검토를 실행하는 서버의 `GPT_API_KEY` | 없음 | 이 프로세스 환경에 키가 없다 | 검토를 실행하는 런타임에 `GPT_API_KEY`가 있어야 한다. 값 출력, 로그, 저장은 하지 않는다. 존재와 호출 결과만 확인한다 |

### 2026-10-28 09:20 KST 자동화 인증 연결

Vercel 프로젝트에 Protection Bypass for Automation이 추가됐다는 보고와, 이 실행 환경이 그 비밀을 요청에 실을 수 있는지는 별개다.

| 단계 | 결과 |
|---|---|
| 비밀이 목록에 있는지, `VERCEL_AUTOMATION_BYPASS_SECRET` 시스템 환경변수로 지정됐는지 | 이 런에서는 확인하지 못했다. `https://vercel.com/jyp-ai1s-projects/ai-startup-validation/settings/deployment-protection` 은 로그인 화면으로 이동했다. HTTP 200, 최종 경로 `/login` |
| Preview 재배포 | 환경변수 지정은 확인하지 못했다. 08:45 KST Preview는 `7e27e461`, `https://ai-startup-validation-h2jmgyi08-jyp-ai1s-projects.vercel.app`, deployment `7373232579`다. 09:24 KST에 `eddc879b`의 Git 연동 Preview가 성공했다. URL `https://ai-startup-validation-pkwsdiksc-jyp-ai1s-projects.vercel.app`, deployment `7373812046`, inspector `https://vercel.com/jyp-ai1s-projects/ai-startup-validation/7wGopZng7hAr7EvBuDm918HMQLxQ`. 이 배포는 시스템 환경변수 지정을 확인한 재배포가 아니다. `/api/build-info`는 호출하지 않았다. `eddc879b`는 검증 SHA가 아니다 |
| `x-vercel-protection-bypass` 적용 | 하지 않았다. 비밀값이 이 프로세스에 없다. 값의 길이, 앞자리, 로그를 남기지 않는다 |
| 앱 JSON과 SHA | 없음. 로그인 HTML이 다시 나왔다는 뜻이 아니라, 요청 자체가 없다 |

이 인증이 연결돼도 모델 호출, 저장, 재조회, 화면 일치는 다음 단계다. 이 프로세스의 `GPT_API_KEY`는 여전히 없다. Vercel Preview 환경에 키가 등록됐다는 보고만으로 이 런의 모델 호출을 시작하지 않는다.

1과 2가 갖춰져도 3이 없으면 모델 호출을 하지 않는다. 인증만으로 검증 시작으로 기록하지 않는다. 세 가지가 모두 갖춰진 뒤에만 모델 호출 → 비교 분석 → 저장 → 재조회 → 새로고침 후 화면 일치를 수행한다.

CPO 검토 요청 조건은 충족되지 않았다. PASS가 아니다.

## 7. CTO 판정

BLOCKED. 자동화 인증은 Vercel 프로젝트 설정으로 보고됐고, 이 실행 환경의 요청에는 연결되지 않았다. 원문 저장과 설정 추가는 호출 증거가 아니다. 이 절은 09:20 KST 실행 기록이다. 10:02 KST 새 VM 결과는 8절이다.

## 8. 2026-10-28 10:02 KST 새 VM 검증

부모 실행 `bc-e981acef-6442-4642-bef1-b0217b624b88`은 우회 비밀이 생기기 전에 부팅된 런이라 재사용하지 않았다. 이 절은 그 이후의 새 VM에서 직접 읽은 결과다. 기억해 둔 SHA를 검증 SHA로 쓰지 않았다.

확인 시각은 2026-10-28 10:02 KST다. `/api/build-info` 응답의 `deployTime`은 `2026-10-28T01:01:34.261Z`였다. 그 필드는 `VERCEL_DEPLOYMENT_CREATED_AT`가 없으면 요청 시각으로 채워지므로, 배포 생성 시각으로 쓰지 않는다.

### 대상 Preview

GitHub deployments에서 `cursor/ai-pm-first-review-4b88`의 최신 성공 Preview를 골랐다. 더 새로운 성공 Preview는 없었다.

| 항목 | 값 |
|---|---|
| Preview URL | `https://ai-startup-validation-cwym6wyfb-jyp-ai1s-projects.vercel.app` |
| GitHub deployment id | `7373862187` |
| GitHub environment | Preview |
| deployment status | success, `2026-10-28T00:28:12Z` (09:28 KST) |
| status id | `20776236741` |
| Vercel deployment id | `H43atu1gu3YMqf7Ziox2P5q1rtbd` |
| inspector | `https://vercel.com/jyp-ai1s-projects/ai-startup-validation/H43atu1gu3YMqf7Ziox2P5q1rtbd` |

이 URL은 Preview다. `alabom.vercel.app`과 `ai-startup-validation-tau.vercel.app`은 호출하지 않았다. 새 Preview는 만들지 않았다. build-info 인증 요청이 앱 JSON으로 성공했기 때문이다.

### 단계 결과

| 단계 | 판정 | 근거 |
|---|---|---|
| 1. 이 프로세스의 우회 비밀 | **PASS** | `VERCEL_AUTOMATION_BYPASS_SECRET` PRESENT, 트림 길이 32. 값 없음 |
| 1. 이 프로세스의 `GPT_API_KEY` | 기록만 | ABSENT, 길이 0. 리뷰 호출은 Preview 서버에서 이루어지므로 이 부재만으로 1단계를 실패로 두지 않음. `OPENAI_API_KEY`로 대체하지 않음 |
| 3. `GET /api/build-info` | 앱 JSON | HTTP 200, `content-type: application/json`. 로그인 HTML 아님. `{"error":"Protected by Vercel Authentication"}` 아님. 앱 사용자 세션은 필요 없다 |
| 3. 확인된 SHA | 응답에서 읽음 | `data.commit` = `fb8efdab28615f2da2dbd4bd41bd875f3c4fcc7d`. `data.branch` = `cursor/ai-pm-first-review-4b88`. JSON `environment`는 `NODE_ENV` 값 `production`이며 GitHub environment Preview와 다르다 |
| 4. `POST /api/ai-pm-review` | 앱 401에서 정지 | HTTP 401, `application/json`, 본문 `{"error":"login_required","review":null}`. Vercel 보호 401이 아니다. `getServerAuthUser()`가 세션 없음으로 반환한 앱 401이다. GPT 호출 아님 |
| 4. 실제 GPT 호출 | 하지 않음 | 라우트는 세션 확인 다음에만 `readGptApiKey()`와 `runFirstReview()`에 도달한다. 이유는 `login_required`. 서비스 롤로 세션을 만들지 않았다. 쿠키를 붙이지 않았다 |
| 4. 리뷰 id | 없음 | `review`는 null |
| 4. `nextQuestion` | 없음 | 고정 규칙 문장도 오지 않았다 |
| 5. Supabase 저장 및 재조회 | **FAIL** | API가 행을 만들지 않았다. 서비스 롤로 `ai_pm_reviews`에 넣지 않았고, 없는 id를 다시 읽지 않았다 |
| 6. UI와 저장된 응답 일치 | **FAIL** | 앱 세션이 없다. 4·5가 통과하지 않아 화면을 성공으로 열지 않았다. Vercel 로그인 화면과 빈 데모는 일치가 아니다 |

사업 문단은 라우트에 한 번 보냈다. 응답에 검토 문장, `questionSource`, `storage.durable`은 없었다.

### 이번 실행의 판정 줄

- 새 실행에서 환경변수 확인: **PASS** (우회 비밀 PRESENT, 길이 32. 로컬 `GPT_API_KEY` ABSENT, 길이 0. 값 없음)
- `/api/build-info`: HTTP 200 / 확인된 SHA `fb8efdab28615f2da2dbd4bd41bd875f3c4fcc7d`
- Preview URL `https://ai-startup-validation-cwym6wyfb-jyp-ai1s-projects.vercel.app` / deployment id `7373862187` (Vercel `H43atu1gu3YMqf7Ziox2P5q1rtbd`)
- `/api/ai-pm-review`: HTTP 401 / 실제 GPT 호출 없음. 이유: `login_required`
- `nextQuestion`: 없음
- Supabase 저장 및 재조회: **FAIL**
- UI와 저장된 응답 일치: **FAIL**
- 최종 판정: **BLOCKED**

CPO 독립 검토는 위 항목이 모두 PASS일 때만 요청한다. 이번 실행은 그 조건에 닿지 못했다. CEO 최종 검토를 요청하지 않는다.

## 9. 2026-10-28 10:21 KST 키 위치와 로그인 경로

CPO 판정은 BLOCKED다. 이번 절은 우회 인증을 다시 호출하지 않았고, 서비스 롤로 검토 행을 만들지 않았다. 실행하지 않은 항목은 PASS로 두지 않는다. Production 잠금과 PR #207 미병합은 유지했다.

### 키

10:21 KST에 이 VM의 비밀 이름 목록은 `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`뿐이다. `GPT_API_KEY`는 그 목록에 없다. 이 프로세스에서도 ABSENT다. `OPENAI_API_KEY`로 대체하지 않는다.

`readGptApiKey()`는 리뷰 요청을 처리하는 Next 서버의 `GPT_API_KEY`만 읽는다. 그 서버는 Preview 함수다. Cloud Agent 비밀 목록에 키를 넣는 것은 그 함수의 환경변수가 아니다. 8절의 `login_required`는 `readGptApiKey()`보다 앞에서 반환되므로, `fb8efdab` Preview 함수 안에 키가 있는지는 **미검증**이다. 서버 키 없음으로 기록하지 않는다.

이 프로세스에는 키 값이 없어 Runtime Secret을 추가하지 못했다. 값을 채팅, 로그, 커밋에 넣지 않았다. 목록에 키가 없는 상태에서 새 Agent를 띄우면 같은 목록을 받으므로, 그 확인 실행은 시작하지 않았다.

### 앱 세션

`getServerAuthUser()`는 Supabase `auth.getUser()`가 성공한 경우에만 사용자를 반환한다. 쿠키 이름은 `sb-`로 시작하고 `auth-token`을 포함한다. 데모 게스트와 `WORKSPACE_MODE=demo`는 이 세션이 아니다. 서비스 롤로 사용자를 만들거나 세션을 발급하지 않았다.

로그인은 `/auth/login`의 Google OAuth이고, 완료 경로는 `/auth/callback`이다. 쿠키는 그 요청의 호스트에 묶인다. Production 호스트에서 만든 쿠키는 이 Preview 호스트로 전달되지 않는다. Vercel 우회 헤더는 이 쿠키를 만들지 않는다.

이 VM으로 브라우저 세션을 넘기는 안전한 저장소는 없다. 쿠키를 채팅, 증거 문서, Runtime Secret에 복사하는 방식은 쓰지 않는다. 세션 값을 받지 않고 검증하는 경로는 하나다. Preview 호스트에서 Google 로그인한 브라우저가 그 호스트의 리뷰 API를 호출하고, 그 다음 이 쪽은 `ai_pm_reviews`를 읽기만 한다. 그 호출은 이번 절에서 실행하지 않았다.

### 실행하지 않은 검증

| 항목 | 판정 | 근거 |
|---|---|---|
| Preview 빌드 식별 | 8절 유지 | 이번 절에서 build-info를 다시 호출하지 않음. SHA `fb8efdab28615f2da2dbd4bd41bd875f3c4fcc7d` |
| Vercel 자동화 인증 | 8절 유지 | 우회 헤더를 다시 보내지 않음 |
| 앱 로그인 | **BLOCKED** | 세션 쿠키가 이 런에 없음. 인증을 우회하지 않음 |
| Preview 서버의 GPT 호출 | **미검증** | 라우트가 세션 확인 전에 모델을 호출하지 않음. 서버 환경의 키 존재는 응답으로 확인하지 않음 |
| Cloud Agent의 `GPT_API_KEY` | **ABSENT** | 비밀 이름 목록에 없음. 새 실행으로 재확인하지 않음 |
| `nextQuestion` | **미검증** | 모델 응답 없음 |
| Supabase 저장·재조회 | **FAIL** | 2026-10-28 10:21 KST `ai_pm_reviews` `content-range */0`. 행을 넣지 않음 |
| UI 일치 | **미검증** | 비교할 저장 결과가 없음 |
| 후속 답변 갱신 | **미검증** | 첫 검토가 없음 |
| 전체 | **BLOCKED** | 실모델 E2E 미완료 |

CPO 독립 검토를 통과 요청으로 올리지 않는다. CEO 최종 검토를 요청하지 않는다.

## 10. 2026-10-28 10:29 KST 사용자 흐름

인증 실패 요청은 다시 보내지 않았다. 서비스 롤로 검토 행을 만들지 않았다. 쿠키 값은 채팅, 이 문서, Runtime Secret에 넣지 않았다.

이 VM의 Chrome 쿠키에는 Preview 호스트의 `sb-` 인증 쿠키가 없다. Google OAuth를 끝낸 브라우저가 이 런에 연결되어 있지 않다. 그래서 사용자 리뷰 요청, 모델 응답, 화면을 한 흐름으로 열지 못했다.

`ai_pm_reviews`는 10:29 KST에 `content-range */0`이다. 재조회할 리뷰 ID가 없다.

Preview 서버의 `GPT_API_KEY`는 미검증이다. 이 런에는 Vercel API 자격과 앱 세션이 없어, 서버 환경의 키 이름을 읽거나 모델 응답으로 확인하지 못했다. Cloud Agent에 키가 없다는 사실로 서버 키 없음을 기록하지 않는다.

| 항목 | 판정 |
|---|---|
| 사용자 리뷰 요청 | 없음 |
| 모델 응답 | 없음 |
| 저장 데이터 | 행 0 |
| 화면 | 열지 않음 |
| 전체 | **BLOCKED** |

## 11. 2026-10-28 11:40 KST 화면 경로 추적

CEO Chrome의 Preview 로그인은 이 런의 브라우저가 아니다. 리뷰 API를 다시 호출하지 않았다. 서비스 롤로 검토 행을 만들지 않았다. 쿠키와 키 값은 적지 않는다.

`ai_pm_reviews`는 이 시각에도 `content-range */0`이다. 리뷰 ID가 없다. `startup_projects`의 `주인집12`(`1fcce0f7-d827-4e44-9c0a-490639b38c54`)는 2026-10-28 11:32 KST에 갱신됐고, 요약 길이는 `주인집11`과 같은 186자다. 요약에 전통주·양조가 있다. `problem`, `solution`, `target_customer`, `business_model`은 비어 있다. 프로젝트 제목은 규칙 판단의 입력이 아니다.

워크스페이스가 보여주는 판단은 `analyzeStrategicIntelligence()`의 규칙 결과다. 화면 컴포넌트는 `SiReviewSurface`와 `SiAiPmBindSurface`다. 버튼 `이 답으로 판단 갱신`은 `applySiFounderAnswer()`로 같은 규칙 계산을 다시 한다. 이 경로는 `POST /api/ai-pm-review`를 호출하지 않는다. `readGptApiKey()`와 모델 호출은 그 POST 핸들러 안에서만, 앱 세션 다음에 있다. `/business-validation`의 `AiPmReviewPanel`만 그 POST를 보낸다. 저장된 리뷰가 0건이므로 그 POST의 성공 응답은 없다.

고정 질문은 `present-si-ai-pm-question.ts`의 `paid_conversion` 문장이다. 화면 문구는 `모델이 만든 질문이 아닙니다`이고 `data-question-source="rule"`이다. 이 질문을 GPT 응답으로 기록하지 않는다. Preview 서버의 `GPT_API_KEY`는 여전히 미검증이다.

같은 시각의 코드 수정은 표시만 바꾼다. 입력 원문을 접힌 빈 칸에 두지 않고, 규칙 판단 문단이 같은 불확실성 문장을 한 번 더 보여 주지 않게 한다. 이 수정은 아직 Preview에서 다시 읽지 않았다. `fb8efdab28615f2da2dbd4bd41bd875f3c4fcc7d`가 앱 JSON으로 확인된 빌드 SHA다. 이 절의 커밋은 그 SHA가 아니다.

| 항목 | 판정 |
|---|---|
| 규칙 화면과 GPT 경로의 구분 | 코드와 빈 `ai_pm_reviews`로 구분됨 |
| 실제 GPT 호출 | **미검증** |
| `nextQuestion` | **미검증** |
| 저장·재조회 | **FAIL** — 리뷰 0건 |
| UI와 모델 응답 일치 | **미검증** |
| 후속 갱신 | **미검증** |
| 전체 | **BLOCKED** |

## 12. 2026-10-28 11:53 KST 워크스페이스 연결

워크스페이스 본문에 `AiPmReviewPanel`을 넣었다. 입력 원문이 8자 이상이면 그 원문을 패널의 초기 글로 둔다. 패널의 `AI PM 1차 검토`는 `POST /api/ai-pm-review`를 호출한다. 모델이 만든 `nextQuestion`만 `questionSource: model-review`일 때 표시한다. 규칙 카드 `SiReviewSurface`와 `이 답으로 판단 갱신`은 그대로 규칙 경로다.

이 연결은 로컬 단위 테스트 10건으로 소스 포함을 확인했다. 로그인된 Preview에서 버튼을 누르지 않았다. `ai_pm_reviews`에 새 행을 만들지 않았다. 리뷰 ID, 모델 응답, 재조회, 화면 일치, 후속 갱신은 없다. `4ddf8a29`와 이번 연결은 앱 JSON의 SHA로 확인하지 않았다. Preview 서버의 `GPT_API_KEY`는 미검증이다.

| 항목 | 판정 |
|---|---|
| 워크스페이스에서 리뷰 API를 호출하는 버튼 | 코드에 연결. Preview 실행은 **미검증** |
| 실제 GPT 응답 / `nextQuestion` | **미검증** |
| 저장·재조회 | **FAIL** — 이번 연결로 만든 행 없음 |
| UI와 후속 갱신 | **미검증** |
| 전체 | **BLOCKED** |

## 13. 2026-10-28 14:03 KST Preview SHA와 첫 실패

UI는 수정하지 않았다. Production `https://alabom.vercel.app`과 잠금 SHA `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`는 호출하지 않았다. 서비스 롤로 검토 행을 만들지 않았다. 키와 쿠키는 적지 않는다.

GitHub deployment `7375920672`의 URL `https://ai-startup-validation-krb3t6jz8-jyp-ai1s-projects.vercel.app`에 우회 헤더로 `GET /api/build-info`를 보냈다.

| 항목 | 결과 |
|---|---|
| HTTP | 200, `application/json` |
| `data.commit` | `c23e37c7a887f856e1e8747a93fa0e093abc7390` |
| `data.branch` | `cursor/preview-login-gate-4b88` |
| `data.environment` | `production`. 이것은 `NODE_ENV`다. Production 배포가 아니다 |
| 기준 커밋과 비교 | 같다. 이 SHA에 워크스페이스의 `AiPmReviewPanel`과 `POST /api/ai-pm-review` 호출이 들어 있다 |
| 화면 버튼 클릭 | 관찰하지 않음. 브라우저에서 `AI PM 1차 검토`를 누르지 않았다 |

같은 URL에 `POST /api/ai-pm-review`를 1회 보냈다. HTTP 401, `application/json`, `error`는 `login_required`, `review`는 null이다. 앱 세션 검사에서 멈췄다. `readGptApiKey()`와 모델 호출 코드에는 들어가지 않았다. 재시도하지 않았다.

| 단계 | 판정 |
|---|---|
| 1. URL과 실행 SHA | **PASS** — 위 JSON |
| 1. 버튼이 POST를 보내는지 | **미검증** — 클릭을 보지 않음 |
| 2. 인증된 요청이 검토 로직에 진입 | **FAIL** — 401 `login_required` |
| 3. 서버 `GPT_API_KEY`와 모델 호출 | **미검증** — 2에서 중단 |
| 4. 모델 원응답과 `nextQuestion` | **미검증** |
| 5. 저장·재조회 | **미검증** — 이 요청은 행을 만들지 않음 |
| 6. UI와 후속 답변 | **미검증** |
| 전체 | **BLOCKED** |

첫 실패는 2단계다. 이 요청에는 Vercel 우회만 있었고 Supabase 세션 쿠키는 없었다. 2026-10-28 14:06 KST에 `ai_pm_reviews`는 `content-range */0`이다. 재조회할 리뷰 ID가 없다. Preview 서버의 `GPT_API_KEY`는 이 401보다 앞에서 읽히지 않으므로 미검증이다. 이 문서 커밋이 만드는 다음 Preview는 build-info로 SHA를 다시 읽기 전에는 검증 대상이 아니다. 읽은 실행 대상은 위 URL과 `c23e37c7a887f856e1e8747a93fa0e093abc7390`이다.

## 14. 2026-10-28 14:20 KST Production 화면의 데이터 경로

CEO가 로그인한 뒤 본 `주인집 13` 화면은 제품 UI가 렌더된 증거다. 이 절은 그 화면이 검토 API 응답인지, 저장된 모델 결과인지, 규칙 결과인지 코드와 저장 데이터로 가른다. UI는 수정하지 않았다. Production은 배포하지 않았다. 브라우저 네트워크 탭은 이 런에서 캡처하지 않았다. 키와 쿠키는 적지 않는다.

### 실행 중인 Production

2026-10-28 14:19 KST `GET https://alabom.vercel.app/api/build-info`는 HTTP 200 JSON이다. `data.commit`은 `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`, `data.branch`는 `main`이다. 잠금 SHA와 같다. JSON의 `deployTime`은 요청 시각으로 채워질 수 있으므로 배포 시각으로 쓰지 않는다. `data.environment`는 `NODE_ENV`다.

같은 호스트 `GET /api/ai-pm-review`는 HTTP 404다. 잠금 SHA의 트리에 `apps/web/app/api/ai-pm-review/route.ts`가 없다. `AI PM 1차 검토` 문자열과 `AiPmReviewPanel`도 없다.

화면에 남은 문장 `질문 엔진이 고른 다음 질문이 아닙니다.`는 잠금 SHA의 `si-ai-pm-bind-surface.tsx`에 있다. 그 카드의 버튼은 `이 답으로 판단 갱신`이고, 제출은 `applySiFounderAnswer()`다. 이 함수는 문서 문자열에 답을 붙인 뒤 `resolveSiJourneyIntegration()`을 다시 계산한다. `workspace-ai-pm-main.tsx`에는 `fetch(`가 없다. 최신 Preview 소스의 같은 카드 문구는 `모델이 만든 질문이 아닙니다.`라서, 이번 화면 문구는 Production 잠금 코드와 맞다.

| 항목 | 판정 |
|---|---|
| Production 워크스페이스 접근 | **PASS** — 로그인 후 화면은 CEO 확인. 실행 SHA는 위 JSON |
| 그 화면의 `POST /api/ai-pm-review` | **없음** — 라우트 404, 버튼과 `fetch`가 잠금 SHA에 없음. 네트워크 탭은 미캡처 |
| 그 화면이 보여주는 질문 | 규칙 질문. `present-si-ai-pm-question.ts`의 `paid_conversion` 고정 문장 |
| 모델 호출 | **미검증** — 이 화면의 코드 경로는 모델 함수에 들어가지 않음 |
| Preview 서버 `GPT_API_KEY` | **미검증** |

### 주인집 13 저장 데이터

프로젝트 id `e341ba90-a16c-4213-9888-3a2e4d59f727`, 상태 DRAFT, `updated_at` `2026-10-28T05:17:45.081Z`(14:17 KST).

| 저장 위치 | 길이 | `…` 포함 |
|---|---|---|
| `summary` | 186 | 없음. `onboarding_context.sprint12.description`과 같다 |
| `onboarding_context.v2Workspace.documentText` | 210 | 없음. `v2Demo.pastedContent`와 같다 |
| `problem`, `solution`, `target_customer`, `business_model` | null | 해당 없음 |

`v2Workspace.reviewCount`는 0, `aiPmLoop.turns`는 0건이다. `ai_pm_reviews`는 이 시각 `content-range */0`이다. 재조회할 리뷰 ID가 없다. 화면은 저장된 모델 검토가 아니다.

### 화면 결함 — 별도 기록, 이번 절에서 수정하지 않음

원문 잘림은 저장된 글에서 생기지 않는다. `summary`와 `documentText`에 `…`가 없다. `…`를 만드는 표시 코드는 잠금 SHA 안에 있다.

- `build-shared-understanding.ts`의 `truncate()`는 48자를 넘기면 `…`를 붙인다. 사업·고객 라벨이 이 함수를 탄다.
- `analyze-strategic-intelligence.ts`의 `clip()`은 140자에서 `…`를 붙인다.
- `clipSentence()`는 160자에서 `…`를 붙일 수 있고, 그 결과가 `shortDescription`이다.
- `WorkspaceExpandableText`에 `preview=""`가 넘어가면 본문은 빈 칸이고 `전체 사업내용 보기`로만 원문이 열린다. 이 prop은 요약 레일, 이해 카드의 사업 원문, 현재 이해 블록에 있다.

고객 문장과 미확인이 같이 나오는 기준은 `mapCustomerField()`다. 고객 언급이 2건 이상이면 값은 비우고 상태는 `needs_confirmation`이며, `missingLine`은 `실제 서비스를 사용하는 사람과 결제하는 사람이 누구인지는 문서에서 확인하지 못했습니다.`다. `collectUnconfirmedLines()`는 고객 상태가 `document`가 아니면 그 문장을 미확인 목록에 넣는다. 구조화 컬럼이 null인 것과 별개로, 문서에서 뽑은 표현과 미확인 문장이 한 카드에 같이 그려진다.

규칙 질문과 모델 질문은 이 화면에서 분리되어 있지 않다. 카드 제목은 `AI PM · S.I.가 지정한 검증`이고, 질문은 규칙 엔진의 고정 문장이다. 모델 실패를 규칙 결과로 대체한 기록이 아니다. 모델 호출 자체가 이 SHA에 없다.

| 결함 | 판정 |
|---|---|
| 원문 잘림 | **FAIL** — 저장 글에는 `…`가 없고, 표시 코드가 `…`를 만든다 |
| 이해 문장과 미확인의 불일치 | **FAIL** — 고객 언급이 있어도 상태가 `document`가 아니면 미확인 문장을 같이 표시 |
| S.I. 질문과 AI PM 표시의 혼합 | **FAIL** — 잠금 SHA 워크스페이스는 규칙 카드만 그린다 |
| 모델 실패를 AI 결과로 표시 | 해당 없음 — 모델 경로가 없음 |

### 최신 Preview

GitHub deployment `7377685089`는 2026-10-28 14:09 KST에 성공했고 SHA는 `9e4541fde9c1b96f5316feaa8cd28963a25ee832`, URL은 `https://ai-startup-validation-97daf7npb-jyp-ai1s-projects.vercel.app`이다. 이 커밋은 증거 문서만 추가한다. 같은 URL의 `GET /api/build-info`는 HTTP 200 `text/html`이다. 앱 JSON이 아니므로 이 SHA를 실행 SHA로 확정하지 않는다. 이전에 앱 JSON으로 읽은 Preview는 `krb3t6jz8`의 `c23e37c7a887f856e1e8747a93fa0e093abc7390`이다. 그 호스트의 버튼 클릭은 아직 관찰하지 않았다.

| 단계 | 판정 |
|---|---|
| A. Production 화면의 API | **규칙 경로** — 검토 API 응답이 아님 |
| B. 로그인된 Preview의 모델 호출 | **미검증** |
| C. 동일 리뷰 ID의 저장·재조회·후속 | **미검증** — 리뷰 0건 |
| D. 화면 결함 | **FAIL** — 위 세 항목. 수정하지 않음 |
| 전체 | **BLOCKED** |

## 15. 2026-10-28 15:10 KST 최신 Preview에서 모델 호출까지

14절의 Production 화면은 다시 열지 않았다. UI와 북마클릿은 넣지 않았다. Production은 배포하지 않았다. 키, 쿠키, 토큰은 적지 않는다.

### 실행 SHA

GitHub deployment `7377894051`의 URL `https://ai-startup-validation-2e70g1z8f-jyp-ai1s-projects.vercel.app`에 우회 헤더로 `GET /api/build-info`를 보냈다. HTTP 200 `application/json`.

| 항목 | 결과 |
|---|---|
| `data.commit` | `18ce422926388c49c713e7340b40208cb4c83d04` |
| `data.branch` | `cursor/preview-login-gate-4b88` |
| `data.environment` | `production`. 이것은 `NODE_ENV`다 |
| 보호 페이지 | 우회 헤더가 있는 런타임에서는 JSON이다. 헤더가 없던 이전 읽기는 HTML이었다 |

이 SHA는 14절 이후의 증거 문서 커밋이다. 검토 버튼 코드는 그 이전 `c23e37c7`에 들어 있고 이 커밋의 조상이다.

### 인증 후 검토 요청

세션은 e2e 헬퍼와 같은 magic-link 사용자 `cto-qa@launchlens.dev`다. `generate_link` HTTP 200, `verify` HTTP 200. 그 쿠키로 `GET /api/ai-pm-review`는 HTTP 200이었다. 앱 세션 검사를 통과했다.

버튼과 같은 `multipart` 필드 `text`로 `POST /api/ai-pm-review`를 두 번 보냈다. 두 번째 호출은 25초 뒤 1회다. 세 번째는 보내지 않았다.

| 호출 | review ID | HTTP | 경과 | 저장 상태 | evidence | callCount | latencyMs | 오류 |
|---|---|---|---|---|---|---|---|---|
| 1 | `db40d893-721c-4b54-8ece-3bb03863c443` | 200 | 2218ms | failed, version 1, durable true | `live_network` | 1 | 1279 | `OpenAI rate limit exceeded` |
| 2 | `f0f53d1a-2f8e-4dbc-bcfa-04e82b38e01c` | 200 | 1164ms | failed, version 2, durable true | `live_network` | 1 | 387 | `OpenAI rate limit exceeded` |

`questionSource`는 null, `nextQuestion`은 null, `rawContent` 길이는 null, `model`은 null이다. 요청에 넣은 모델 이름은 코드의 `gpt-4o-mini`다. 응답 본문이 오기 전에 예외가 나서 저장 레코드의 `model`은 비어 있다. 어댑터 `mapOpenAIError`는 HTTP 429만 이 문장으로 바꾸고 응답 본문은 버린다. 그래서 저장 오류만으로는 분당 한도와 결제 한도를 나누지 못한다.

키가 없으면 상태는 `not_run`, `callCount` 0, 오류 `gpt_api_key_missing`이다. 이번 두 건은 그 경로가 아니다. Preview 서버는 `GPT_API_KEY`를 읽고 모델 API를 호출했고, 제공자가 429를 반환했다.

같은 ID로 REST 재조회가 되었다. `GET /api/ai-pm-review` 목록에 첫 ID가 있고, 두 번째 호출 뒤 목록 재확인은 두 번째 실행에서 실패로 끝났다. 화면이 읽는 목록 API와 저장 행의 `nextQuestion`은 둘 다 비어 있어 서로 같다. 모델 질문이 화면에 나올 응답은 없다.

후속 `POST /api/ai-pm-review/follow-up`은 보내지 않았다. 부모 상태가 `succeeded`가 아니면 그 라우트는 `review_missing`이다.

| 단계 | 판정 |
|---|---|
| 1. 최신 Preview URL과 실행 SHA | **PASS** |
| 2. 인증 후 검토 핸들러 진입 | **PASS** — magic-link 세션, GET 200, POST가 키 읽기와 모델 호출까지 진행 |
| 3. 모델 API 호출 | **FAIL** — 두 번 모두 제공자 HTTP 429 |
| 4. 모델 원응답과 `nextQuestion` | **FAIL** — 원응답 없음 |
| 5. 실패 행의 저장·재조회 | **PASS** — 위 두 ID. 모델 답변의 저장은 아님 |
| 6. UI 일치와 후속 답변 | **BLOCKED** — 실패 행은 목록과 일치. 후속 검토는 실행하지 않음 |
| 전체 | **BLOCKED** |

## 16. 2026-10-28 15:31 KST 제공자와 429 본문

새 검토 요청은 보내지 않았다. 키를 만들거나 읽지 않았다. 결제, 모델, Production 설정은 바꾸지 않았다.

### 호출한 제공자와 endpoint

검토 라우트는 `OpenAIProviderAdapter`만 만든다. 이 어댑터의 `chat()`은 `openAIChat()`만 호출한다. `openAIChat()`의 URL은 코드에 고정된 `https://api.openai.com/v1/chat/completions`다. base URL 설정은 없다. 요청 모델 필드는 `gpt-4o-mini`다.

OpenRouter 호출은 다른 함수 `openRouterChat()`이고 URL은 `https://openrouter.ai/api/v1/chat/completions`다. 검토 라우트는 이 함수를 호출하지 않는다. OpenRouter 429의 저장 문장은 `OpenRouter rate limit exceeded`다. 저장된 문장은 그 문장이 아니다.

`GPT_API_KEY`는 값의 형태로 제공자를 고르지 않는다. `readGptApiKey()`는 그 이름의 문자열이 비었는지만 본다. 비어 있지 않으면 위 OpenAI URL로 그 값을 `Authorization`에 실어 보낸다.

### 기존 실패 행에 남은 것

| review ID | finished_at (KST) | 저장된 error | provider request id | Retry-After | 원본 본문 |
|---|---|---|---|---|---|
| `db40d893-721c-4b54-8ece-3bb03863c443` | 15:07 | `OpenAI rate limit exceeded` | 없음 | 없음 | 없음 |
| `f0f53d1a-2f8e-4dbc-bcfa-04e82b38e01c` | 15:10 | `OpenAI rate limit exceeded` | 없음 | 없음 | 없음 |

이 문장은 `mapOpenAIError()`가 HTTP 429일 때만 만든다. 401이면 저장 문장은 `OpenAI API key invalid or missing`이다. 그 외 상태면 `OpenAI API error (상태코드)`다. 두 행의 문장이 429용 문장과 같으므로, `api.openai.com`이 HTTP 429를 반환한 호출이다.

같은 함수는 429에서 응답 본문을 예외에 넣지 않는다. `openAIChat()`은 `Retry-After`와 `x-request-id`를 읽지 않는다. `finishCall()`이 저장하는 값은 `error.message`뿐이다. 그래서 제공자 오류 코드 `insufficient_quota`와 `rate_limit_exceeded`는 이 행에 남아 있지 않다. 모델 이름, `rawContent`, 사용량도 없다. 성공 응답의 `id`는 오류 응답에서 파싱되지 않는다.

### 대시보드와의 관계

OpenRouter 최근 1개월 사용량 `$0.00`, Requests `0`은 이 코드 경로와 모순되지 않는다. 검토 요청은 OpenRouter URL로 가지 않는다. 그 화면은 이번 429의 계정이 아니다.

429의 세부 원인는 이 행만으로 확정되지 않는다. 결제 한도와 속도 제한은 둘 다 HTTP 429이고, 저장된 문장은 같다. 모델 없음은 보통 다른 상태 코드라 이번 문장과 다르다. 그 구분은 버려진 본문이 있어야 한다.

| 항목 | 판정 |
|---|---|
| 실제 제공자와 endpoint | **확정** — OpenAI `https://api.openai.com/v1/chat/completions`, 모델 필드 `gpt-4o-mini` |
| 원본 429의 오류 코드·메시지 | **없음** — 본문과 헤더가 저장되지 않음. 남은 문장은 어댑터가 만든 `OpenAI rate limit exceeded` |
| 결제 한도 / 속도 제한 / 모델 접근 | **미확정** — 상태 429만 확정 |
| 설정 변경 | **하지 않음** — OpenRouter 충전, OpenAI 결제 변경, 키 교체, 모델 변경 없음 |
| 전체 | **BLOCKED** |

## 17. 2026-10-28 15:46 KST 429 코드 한 건

기존 실패 행 `db40d893-721c-4b54-8ece-3bb03863c443`와 `f0f53d1a-2f8e-4dbc-bcfa-04e82b38e01c`는 덮어쓰지 않았다. 어댑터는 429 본문의 `error.code`, `error.type`, 180자 이내의 `error.message`, `x-request-id`, `Retry-After`, rate-limit 헤더만 저장 문장에 붙인다. 키와 요청 본문은 그 문장에 넣지 않는다. 사용자 화면의 실패 문구는 기존과 같이 `검토가 끝나기 전에 실패했습니다. 결과 원문은 없습니다.`다. 진단 문장은 화면 JSON에 나가지 않는다.

배포 `7378996575` URL `https://ai-startup-validation-bou5x1z8x-jyp-ai1s-projects.vercel.app`의 `GET /api/build-info`는 HTTP 200 JSON이다. `data.commit`은 `2ec6694a143c5902b961916e7314d336b6273ee8`, `data.branch`는 `cursor/preview-login-gate-4b88`이다. 이 SHA에 진단 어댑터가 들어 있다. 검토 요청은 그 확인 뒤 1회만 보냈다. 재시도는 없다.

새 행 `973cd265-0a1f-4a4b-a92d-6d8acdd4dfb2`, version 3, `finished_at` `2026-10-28T06:46:55Z`(15:46 KST). HTTP 200, 경과 2480ms, `callCount` 1, `evidence` `live_network`, `latencyMs` 1526, `storage.durable` true. `questionSource`는 null, `nextQuestion`은 null, `rawContent`는 없다.

저장된 error:

`OpenAI rate limit exceeded provider_http=429 code=credit_balance_exhausted type=insufficient_quota message=You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/. request_id=req_7e7fc878f6f6482595f9097aa2045dd4`

`retry_after`와 `x-ratelimit-*`는 이 문장에 없다. 응답에 그 헤더가 없었거나 허용 형식이 아니었다. `x-request-id`는 `req_7e7fc878f6f6482595f9097aa2045dd4`다.

이 코드는 할당량·결제 쪽이다. `type`은 `insufficient_quota`, `code`는 `credit_balance_exhausted`다. 제공자 메시지는 남은 크레딧이 없다고 말한다. 속도 제한으로 보지 않는다. 잔액의 숫자와 조직 화면은 이 한 건으로 열지 않았다. 후속 검토는 보내지 않았다. 목록 API에는 이 ID가 있고 `nextQuestion`은 저장 행과 같이 비어 있다.

| 항목 | 판정 |
|---|---|
| Preview URL과 SHA | **PASS** — 위 URL, `2ec6694a143c5902b961916e7314d336b6273ee8` |
| 진단 어댑터가 검토 경로에서 호출됨 | **PASS** — 저장 문장에 `provider_http=429`와 `code`가 있음 |
| 429 원인 | **확정** — `credit_balance_exhausted` / `insufficient_quota` |
| `x-request-id` | **있음** — `req_7e7fc878f6f6482595f9097aa2045dd4` |
| `Retry-After` | **없음** |
| 모델 분석과 `nextQuestion` | **FAIL** — 원응답 없음 |
| 실패 행 저장·재조회 | **PASS** — 새 ID. 성공 결과의 저장은 아님 |
| 후속 답변 | **실행하지 않음** — 부모가 성공이 아님 |
| 결제·키·모델·Production | **변경하지 않음** |
| 전체 | **BLOCKED** |

## 18. 2026-10-28 16:21 KST 짧은 검토 1회와 후속 1회

입력 예산은 추정 3,000토큰, 출력 상한은 800토큰이다. 모델에게 요청하는 키는 `problem`, `target_customer`, `solution`, `business_model`, `validation_metric`, `nextQuestion`이다. 크레딧 소진 또는 `insufficient_quota`일 때만 `gemini-3.1-flash-lite`로 한 번 넘긴다. 자동 재시도는 없다. 이번 두 호출은 그 분기를 타지 않았다. 제공자는 `openai`, 응답 모델은 `gpt-4o-mini-2024-07-18`이다.

배포 `7379509147` URL `https://ai-startup-validation-4o6uo061l-jyp-ai1s-projects.vercel.app`의 `GET /api/build-info`는 HTTP 200 JSON이다. `data.commit`은 `75769c20c1939a048a5d9a75140928fef00b42c4`이다. 그 확인 뒤에 1차 검토 1회, 성공 뒤에 후속 1회를 보냈다.

| 구분 | review ID | 시각 (KST) | 토큰 입력/출력/합 | `nextQuestion` |
|---|---|---|---|---|
| 1차 | `0a13c604-9931-40c5-88a5-80f06687fd5a` | 16:21:46 | 228 / 175 / 403 | 어떤 방식으로 양조장과의 파트너십을 구축할 계획인가? |
| 후속 | `8602a92e-0fbd-4d93-a005-9c9f18410ac6` | 16:21:52 | 531 / 184 / 715 | 양조장 두 곳에 안내 비용을 제안한 적이 없는데, 어떻게 파트너십을 구축할 계획인가? |

두 행 모두 `status` succeeded, `evidence` `live_network`, `callCount` 1, `usageKnown` true, `storage.durable` true다. `questionSource`는 `model-review`이고, 각 `nextQuestion` 문장은 그 행의 `rawContent` 안에 있다. 고정 규칙 문장과 같지 않다. 후속 행의 부모는 1차 ID이고, 질문은 1차 질문과 다르다. 후속 질문에는 제출한 답 `양조장 두 곳에 안내 비용을 제안한 적은 없다`가 반영되어 있다. 목록 API의 두 질문도 저장 행과 같다. 이 목록이 화면이 읽는 응답이다. 이 런에서 브라우저 화면은 열지 않았다.

세션은 e2e magic-link 사용자다. Production은 호출하지 않았다.

| 항목 | 판정 |
|---|---|
| Preview URL과 SHA | **PASS** |
| OpenAI 1회, 출력 800 이내 | **PASS** — 전환 없음 |
| 모델 `nextQuestion`이 원응답 안에 있음 | **PASS** |
| 저장·재조회 | **PASS** — 위 두 ID |
| 목록 응답과 저장 질문 일치 | **PASS** |
| 후속 답변으로 질문이 바뀜 | **PASS** |
| 브라우저에서 연 화면 | **없음** |
| 전체 데이터 경로 | **기록함** |

## 19. 2026-10-28 17:16 KST 한 화면 흐름

문서가 있는 워크스페이스 본문은 규칙 판단, 이해 카드, 요약을 같이 두지 않는다. 스크립트 샘플 재생이 아닐 때 본문은 AI PM 검토 하나만 둔다. 순서는 결과 확인, 피드백, 수정된 판단, 다음 검증이다. 피드백 저장은 모델 호출이 아니다.

로그인 전 데모는 `입력 원문 · 모델 검토 전`이다. 미확인 가설을 만들지 않고, 규칙 질문 문장을 보여 주지 않는다. 선택값은 이 브라우저에만 남는다.

로그인한 세션에서 문서가 저장된 검토 입력과 같으면 `모델이 작성한 검토`로 표시한다. 선택값은 그 검토 행에 저장하고, 수정 화면은 그 선택을 제품 로직으로 반영한다. 다음 질문이 모델 질문이면 답을 보낼 때만 기존 후속 호출 한 번이 있다.

로컬 `http://127.0.0.1:3000` 확인:

| 항목 | 판정 |
|---|---|
| 로그인 전 데모, 규칙 표면 없음, 브라우저 저장, 답 반영 | **PASS** — 모델 호출 없음 |
| QA 세션이 저장 검토를 연 화면 | **PASS** — `data-result-source=model-review`, 규칙 표면 0 |
| 피드백 계정 저장 | **PASS** — `61e5a6ff-fd88-4a8f-bff1-f532e4e1ab8b`, 검토 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`, `marks` `evidence_unclear`, `modelCalls` 0. 시각 2026-10-28 17:16 KST |
| 다음 질문 | **PASS** — 저장 행의 질문. 답 제출은 누르지 않음 |
| QA 세션으로 주인집 13 | **열리지 않음** — `project_not_owned` 로 `/workspace` 이동 |
| 이 커밋의 Preview SHA | **아직 아님** — 푸시 뒤 `/api/build-info` 를 다시 읽기 전 |

## 20. 2026-10-28 18:26 KST Preview SHA와 저장 피드백

`8382703667f1502442beeb72a0fe061ec59abb71`의 Preview는 배포되지 않았다. Vercel 상태 시각 2026-10-28 17:21 KST, 배포 `dpl_28e9sczgrsrGHqn81MbUB7gtG3EU`, 상태 failure. 로컬 `next build`는 `ai-pm-review-panel.tsx`가 `ReviewMark`를 가져오지만 그 모듈이 타입을 내보내지 않아 실패했다. 그 커밋을 실행 SHA로 두지 않는다.

수정 커밋 `677dda3857cf045adc3af2f43c68f30c3ec996eb`은 타입을 내보내고, 같은 검토를 다시 열 때 계정에 저장된 마지막 선택값을 수정 화면에 되돌린다. 모델 호출은 없다. GitHub Vercel 상태는 2026-10-28 18:16 KST에 완료였다.

실행 URL: `https://ai-startup-validation-git-cursor-ai-pm-62f67e-jyp-ai1s-projects.vercel.app`

`/api/build-info`는 우회 헤더로 HTTP 200 `application/json`이었다. 헤더 값은 적지 않는다. `commit`은 `677dda3857cf045adc3af2f43c68f30c3ec996eb`, `branch`는 `cursor/ai-pm-single-flow-4b88`이다. 응답의 `environment` 값 `production`은 `NODE_ENV`다. `deployTime` 필드는 `2026-10-28T09:19:57.504Z`(18:19 KST)이고, `VERCEL_DEPLOYMENT_CREATED_AT`가 없으면 요청 시각이다. `83827036`과 일치하지 않는다.

세션은 QA magic-link `cto-qa@launchlens.dev`다. CEO Google 로그인이 아니다. 모델 검토 POST와 후속 POST는 호출하지 않았다. `AI PM 1차 검토`와 `이 답으로 다음 검증`은 누르지 않았다.

QA 사용자 프로젝트 169개의 붙여넣은 내용, 워크스페이스 문서, 요약을 저장 검토 입력(sha256 앞 12자 `41f6a59ed84d`, 정규화 길이 186)과 비교했다. 일치하는 필드는 없다. 연 프로젝트는 `33dc7045-6a8d-48ca-940e-2ba499b1027a`, 제목 가사 도우미 중개. HTTP 200. `data-result-source=input-only`, `data-step=result`. 저장 질문 `양조장 두 곳에 안내 비용을 제안한 적이 없는데`는 화면에 없었다. 양조장 검토는 붙지 않았다. 주인집 13 `e341ba90-a16c-4213-9888-3a2e4d59f727`은 열지 않았다.

저장 검토가 보이는 경로는 데모 문서 주입이다. URL `/workspace?demo=guided&sample=custom&fresh=1`, 프로젝트 id `demo-my-qa-preview-3b13`. 세션 저장소에 저장 검토 입력 186자를 넣었다. 소유 프로젝트가 아니다. 로드 후 `data-result-source=model-review`, `data-step=result`. 이전 계정 선택 `evidence_unclear`를 해제하고 `understanding_wrong`, `core_missing`을 저장했다.

저장 직후 `data-step=revised`. 화면에 `오류로 표시`, `빠진 핵심`, `이 검토 버전에 저장했습니다. 모델 호출은 없습니다.`가 있었다. 같은 URL을 다시 열고 문서를 다시 넣은 뒤 `data-result-source=model-review`, `data-step=result`. 두 문장이 남아 있었고 메시지는 `저장된 피드백을 다시 열었습니다. 모델 호출은 없습니다.`였다.

`GET /api/ai-pm-review` HTTP 200. 검토 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`, status `ready`. 새 피드백 `cb7d0a54-6beb-4b46-bca9-b4e2f121dc84`, 시각 2026-10-28 18:26 KST, marks `understanding_wrong`, `core_missing`. 저장 행 `modelCalls` 0. 이전 행 `61e5a6ff-fd88-4a8f-bff1-f532e4e1ab8b`, `e9957bb1-92d2-4d31-92f1-cc2289bfc9eb`는 `evidence_unclear`로 남아 있다.

이후 모델 검토가 이 수정을 유지하는지는 확인하지 않았다. 모델 호출을 하지 않았다. 같은 검토를 다시 열 때 선택과 수정 문장이 남는 것까지만 확인했다.

Production 잠금 `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`와 PR #207, #208, #209 미병합은 유지했다. Production 호스트는 호출하지 않았다.

| 항목 | 판정 |
|---|---|
| `83827036`과 `/api/build-info` 일치 | **FAIL** — 그 커밋은 배포 실패. 실행 SHA는 `677dda38` |
| 실행 Preview SHA | **PASS** — URL 위, commit `677dda3857cf045adc3af2f43c68f30c3ec996eb` |
| 소유 프로젝트에 저장 검토 연결 | **BLOCKED** — 일치 문서 없음. 가사 도우미 중개는 입력 원문 |
| 틀림·핵심 누락 저장, 재조회, 다시 열기 | **PASS** — 데모 문서 주입. 피드백 `cb7d0a54-6beb-4b46-bca9-b4e2f121dc84`, `modelCalls` 0 |
| 이후 모델 검토가 수정을 유지 | **하지 않음** — 모델 호출 없음 |
| Production 배포 | **잠금 유지** |

## 21. 2026-10-28 18:56 KST 소유 프로젝트와 저장 검토

검토 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`에는 프로젝트 ID 컬럼이 없다. `ai_pm_reviews`의 연결 키는 `user_id`와 `input_sha`다. `record_json` 키에도 project가 없다. `input_origin`은 `typed`다. `input_sha`는 `41f6a59ed84d6dc63e791c4043668ac7e80eed269a42dd28de36865ef87dee47`이고, 정규화한 입력 길이는 186이다. 같은 입력의 검토 1~5버전은 모두 사용자 `37d541c8-fda7-4788-8ac2-1a449b00425c`다. 이 사용자는 QA magic-link `cto-qa@launchlens.dev`다. 피드백 세 행도 같은 사용자다.

프로젝트 전체는 230개다. `summary`가 그 입력과 같은 프로젝트는 9개다. 주인집4, 주인집5, 주인집 6, 주인집 7, 주인집10, 주인집11 `e719bc33-e35b-40d9-9494-167e603a338e`, 주인집12, 주인집 13 `e341ba90-a16c-4213-9888-3a2e4d59f727`, 주인집 14. 소유자는 `8b023d94-dd5f-4cad-bd7e-76b6fbdf0674`다. Google 로그인 계정이고 QA 계정이 아니다. 문서 ID는 따로 없다. 문서 문자열은 `onboarding_context.v2Demo.pastedContent`와 `onboarding_context.v2Workspace.documentText`다.

주인집 13의 요약은 검토 입력과 같다. 화면이 읽는 문서는 `프로젝트 이름: 주인집 13`과 `사업 설명:`이 앞에 붙은 210자다. 그 사업 설명 본문은 검토 입력과 같다. 원문 전체를 그대로 비교하면 끊긴다. 본문을 비교하면 같다. 검토 사용자와 프로젝트 소유자가 다르므로 QA 세션은 이 프로젝트를 열 수 없다. 이 검토 행을 Google 계정으로 옮기지 않았다.

검토 사용자 소유의 프로젝트 `3a5fc4a0-2e90-45e6-8370-350beda67342`, 제목 양조장 체험 연결을 2026-10-28 18:43 KST에 저장했다. `is_demo`는 false다. 문서 형태는 주인집 13과 같다. 원문 sha256 앞 12자는 `61f7f83ac891`이고, 사업 설명 본문 sha256 앞 12자는 `41f6a59ed84d`다. 세션 저장소에 문서를 넣지 않았다.

화면 비교는 사업 설명 본문을 쓴다. 실행 URL은 `https://ai-startup-validation-git-cursor-ai-pm-62f67e-jyp-ai1s-projects.vercel.app/workspace?project=3a5fc4a0-2e90-45e6-8370-350beda67342`다. `/api/build-info`는 HTTP 200 JSON이고 commit은 `f0a2a935e9fca08bf40f534d70b897e0f5ef526c`, branch는 `cursor/ai-pm-single-flow-4b88`이다. GitHub Vercel 완료 시각은 2026-10-28 18:56 KST다. `d6fd03b4`에서는 첫 화면의 수정 문장이 새로고침 뒤에 사라졌다. 그 SHA를 최종 실행으로 두지 않는다.

QA 세션으로 연 결과, `data-result-source=model-review`, `data-step=result`. `오류로 표시`와 `빠진 핵심`이 보였고 메시지는 `저장된 피드백을 다시 열었습니다. 모델 호출은 없습니다.`였다. 같은 URL을 한 번 새로고침한 뒤에도 두 문장이 남았다. `AI PM 1차 검토`와 `이 답으로 다음 검증`은 누르지 않았다. 모델 호출은 없다.

`GET /api/ai-pm-review`는 검토 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`, status `ready`다. 최신 피드백 `cb7d0a54-6beb-4b46-bca9-b4e2f121dc84`, marks `understanding_wrong`, `core_missing`, 저장 행 `modelCalls` 0.

이후 모델 검토가 이 수정을 유지하는지는 호출하지 않아 미검증이다. Production 잠금과 PR #207, #208, #209 미병합은 유지했다. `83827036`은 배포된 SHA가 아니다.

| 항목 | 판정 |
|---|---|
| 검토 행의 연결 키 | **기록** — 프로젝트 ID 없음. 사용자 `37d541c8-fda7-4788-8ac2-1a449b00425c`, 입력 sha `41f6a59ed84d` |
| 주인집 문서 본문 | **같음** — 소유자 `8b023d94-dd5f-4cad-bd7e-76b6fbdf0674`. 화면 원문은 제목 줄이 붙어 다름 |
| 실행 SHA | **PASS** — `f0a2a935e9fca08bf40f534d70b897e0f5ef526c` |
| 소유 프로젝트에서 저장 검토 | **PASS** — `3a5fc4a0-2e90-45e6-8370-350beda67342`, `model-review` |
| 저장 피드백 복원과 새로고침 | **PASS** — `understanding_wrong`, `core_missing`, `modelCalls` 0 |
| 수정 반영 후속 모델 검토 | **미검증** |
| Production | **잠금 유지** |

## 22. 2026-10-28 19:10 KST 후속 검토 1회

기준선은 소유 프로젝트 연결 게이트의 Preview SHA `f0a2a935e9fca08bf40f534d70b897e0f5ef526c`, 프로젝트 `3a5fc4a0-2e90-45e6-8370-350beda67342`, 검토 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`, 피드백 `cb7d0a54-6beb-4b46-bca9-b4e2f121dc84`다. 그 피드백의 marks는 `understanding_wrong`, `core_missing`이고 `modelCalls`는 0이다. 댓글은 `사업 이해가 틀림, 핵심 내용이 빠짐`이다. 대표가 적은 대체 사실은 없다.

`f0a2a935`의 후속 요청에는 선택값과 매핑된 동의 필드가 있고, 수정 화면 문장 `오류로 표시`와 `빠진 핵심`은 없다. 그 문장을 요청에 넣는 커밋은 `6b485ac396c5306177ced9050bc8ef0894ca9094`다. GitHub 커밋 status `Vercel`은 success, 설명은 `Deployment has completed`, 시각은 2026-10-28 19:09 KST다. 대상은 `https://vercel.com/jyp-ai1s-projects/ai-startup-validation/24ViCL6V6aCscPf2oWCzL6Spxa3A`다. PR #209의 Vercel 댓글 `updated_at`도 같은 시각이고 `nextCommitStatus`는 `DEPLOYED`다. Preview 별칭은 `https://ai-startup-validation-git-cursor-ai-pm-62f67e-jyp-ai1s-projects.vercel.app`다.

이 환경에서 인증 없는 `GET /api/build-info`는 HTTP 401 `Protected by Vercel Authentication`이다. 앱 JSON의 commit 필드는 이번 기록에서 다시 읽지 않았다. 저장 행의 `finished_at`은 배포 완료 기록보다 뒤다.

후속 행은 `e31d62a4-0870-4cce-b655-9080a174ffc5`다. 부모는 5버전 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`이고, 5버전의 자식은 이 행 하나다. `source_feedback_id`는 `cb7d0a54-6beb-4b46-bca9-b4e2f121dc84`다. `supplement_sha`는 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`이고, 이는 빈 문자열의 sha256이다. status `succeeded`. evidence `live_network`. error는 없다. provider `openai`. model `gpt-4o-mini-2024-07-18`. `callCount` 1. prompt 659, completion 175, total 834. `finished_at` `2026-10-28T10:10:21.693Z`(19:10 KST). 사용자 앞 8자는 `37d541c8`다. 검토 행에는 프로젝트 ID가 없다. 입력 sha 앞 12자는 `41f6a59ed84d`다. 두 번째 후속 행은 없다. 와이어 HTTP 본문은 행에 저장되지 않는다.

요청 입력은 그 커밋의 `buildFollowUpRequest`를 저장된 5버전 섹션과 위 피드백, 빈 supplement에 적용한 재구성이다. 시스템 문장은 `당신은 ALABOM의 AI PM이다. 입력에 없는 가격, 인원, 매출, 시장 규모는 만들지 않는다. JSON 객체만 반환한다. 키는 problem, target_customer, solution, business_model, validation_metric, nextQuestion 이다. nextQuestion은 이 입력에서 창업자가 답해야 판단이 바뀌는 질문 하나다. 질문 목록의 문장을 복사하지 않는다. 모델 이름이나 공급사 이름은 쓰지 않는다.`다. 사용자 문장은 이전 검토 JSON, 이전 다음 질문, 피드백 JSON, 아래 수정 문장, `추가 사실: (없음)`, 키 목록이다. 원문 사업 계획 전문은 들어가지 않는다. 수정 문장은 다음이다.

```text
수정된 사업 이해:
사업 이해는 오류로 표시되었습니다. 이 문장을 확인된 사실로 두지 않습니다.
빠진 핵심은 다음 검증에서 받습니다.
오류로 표시된 이전 문장은 확인된 사실로 반복하지 않는다.
빠진 핵심은 입력에 없으면 만들지 않고 다음 질문으로 받는다.
```

피드백 JSON의 marks는 `understanding_wrong`, `core_missing`이다. agreement `disagree`, accuracy `misstated`, revisionAreas `problem`, nextAction `verify_hypotheses`. 입력 예산 3000 안에서 OpenAI prompt 토큰은 659라 사용자 문장이 잘렸을 근거는 없다.

모델 응답 `rawContent`는 다음이고, `nextQuestion`은 그 안에 있다.

```json
{"problem":"관광객들이 전통주 체험을 제공하는 양조장에 대한 정보와 접근성이 부족하다.","target_customer":"전통주를 좋아하는 내국인 및 외국인 관광객.","solution":"양조장 체험 프로그램을 제공하고, 이를 통해 관광객이 직접 전통주를 만들고 즐길 수 있도록 안내하며, 주변 관광명소도 함께 소개하는 서비스.","business_model":"양조장 체험 프로그램 참가비 및 온라인 마케팅 지원을 통한 수익 창출.","validation_metric":"프로그램 참가자 수 및 고객 만족도 조사 결과.","nextQuestion":"양조장 두 곳에 안내 비용을 제안한 적이 없는데, 어떻게 파트너십을 구축할 계획인가?"}
```

5버전 판단은 개인별 경험, 양조장 정보와 접근성 부족, 같은 고객, 참가비와 온라인 마케팅 수익이다. 5버전 다음 질문은 `양조장 두 곳에 안내 비용을 제안한 적이 없는데, 어떻게 파트너십을 구축할 계획인가?`다.

6버전 problem과 judgment에서는 `개인별 다양한 경험을 중시하지만`이 빠졌다. 접근성 부족, 고객, 수익 가설, execution, market, nextQuestion, nextQuestionReason은 5버전과 같다. 오류로 표시된 이해를 확인된 사실에서 빼지 않았다. 빠진 핵심을 묻는 질문으로 바뀌지 않았다. 화면에 선택값이 남아 있는 것으로 통과로 두지 않는다.

같은 사용자가 같은 입력을 여러 프로젝트에 저장하는 회귀는 이 기록에 없다.

| 항목 | 판정 |
|---|---|
| 기준선 SHA `f0a2a935` | **고정** — 소유 프로젝트 연결 게이트의 실행 SHA |
| 수정 문장을 넣은 커밋의 배포 기록 | **기록** — `6b485ac3`, Vercel 완료 19:09 KST. 이번 턴의 `/api/build-info` JSON은 401이라 미확인 |
| 수정 문장이 요청 재구성에 포함 | **PASS** — 위 네 문장과 marks. 와이어 원문은 행에 없음 |
| 호출 1회, 모델과 토큰 | **PASS** — `gpt-4o-mini-2024-07-18`, 659/175/834, `callCount` 1, 자식 행 1개 |
| 프로젝트 ID | **기록** — `3a5fc4a0-2e90-45e6-8370-350beda67342`. 검토 행 자체에는 없음 |
| 잘못 이해한 내용이 수정됨 | **FAIL** — 접근성 부족, 고객, 수익 가설이 판단으로 남음 |
| 누락된 핵심이 보완됨 | **FAIL** — 다음 질문이 5버전과 같음 |
| 후속 검토 게이트 | **BLOCKED** |
| Production | **잠금 유지** |

## 23. 2026-10-28 19:45 KST 비교 게이트와 후속 1회

`understanding_wrong`은 문제, 고객, 수익 문장을 지우지 않고 재확인 대상으로 남긴다. 그 문장을 확정된 사실로 반복하면 통과하지 않는다. `core_missing`은 다음 질문이 이전 질문과 다르고 `빠진 핵심`을 묻게 한다. 그 공백을 새 주장으로 채우면 통과하지 않는다. 요청은 `originalInput`, `previousReview`, `feedback`, `supplement`, `revision`을 한 JSON의 별도 필드로 보낸다. 모델은 `gpt-4o-mini`, 입력 3000, 출력 800이다.

회귀 테스트는 검토 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`의 문장과 피드백 `cb7d0a54-6beb-4b46-bca9-b4e2f121dc84`의 두 표시를 쓴다. 6버전 응답은 `confirmed_reuse`, `question_unchanged`, `missing_core_not_asked`로 거절된다. 재확인 문구와 `이 검토에서 빠진 핵심은 무엇입니까?`는 통과한다. 거절된 응답은 같은 피드백과 빈 보충으로 다시 호출되지 않는다. `pnpm exec vitest run`으로 이 파일과 표시 파일, 15개가 통과했다.

실행 SHA는 `ccca30c3e82d546c114bfe200c192d81df605a5a`다. `/api/build-info`는 HTTP 200 JSON, commit 그 값, branch `cursor/ai-pm-single-flow-4b88`이다. 그 다음에 `POST /api/ai-pm-review/follow-up` 1회. 본문은 `reviewId` `8602a92e-0fbd-4d93-a005-9c9f18410ac6`, `supplement` 빈 문자열. HTTP 200. `reused` false. 응답 `revision.pass` false. `sections`는 null이다.

저장 행 `62b5588c-0d11-42c8-8fac-d24d25dc4f20`. version 7. status `failed`. 부모 `8602a92e-0fbd-4d93-a005-9c9f18410ac6`. `source_feedback_id` `cb7d0a54-6beb-4b46-bca9-b4e2f121dc84`. `finished_at` `2026-10-28T10:45:41.6+00:00`(19:45 KST). provider `openai`. model `gpt-4o-mini-2024-07-18`. `callCount` 1. prompt 797, completion 192, total 989. error `revision_gate`. 5버전의 자식은 6버전과 이 7버전, 둘이다. 6버전 행은 그대로다.

모델 응답 `rawContent`는 다음이다.

```json
{"problem":"재확인 대상: 관광객들이 개인별 다양한 경험을 중시하지만, 전통주 체험을 제공하는 양조장에 대한 정보와 접근성이 부족하다. 이 해석은 확정된 사실이 아니다.","target_customer":"전통주를 좋아하는 내국인 및 외국인 관광객.","solution":"양조장 체험 프로그램을 제공하고, 이를 통해 관광객이 직접 전통주를 만들고 즐길 수 있도록 안내하며, 주변 관광명소도 함께 소개하는 서비스.","business_model":"양조장 체험 프로그램 참가비 및 온라인 마케팅 지원을 통한 수익 창출.","validation_metric":"프로그램 참가자 수 및 고객 만족도 조사 결과.","nextQuestion":"어떤 방식으로 양조장과의 파트너십을 구체화할 계획인가?"}
```

문제 문장은 재확인 대상으로 남았다. 고객과 수익 가설은 5버전과 같은 확정 문장이다. 다음 질문은 5버전과 다르지만 `빠진 핵심`을 묻지 않는다. 비교 결과 `failures`는 `confirmed_reuse`, `missing_core_not_asked`다. 저장 요약은 `표시한 오해가 확정된 사실로 다시 남았습니다. 다음 질문이 빠진 핵심을 묻지 않습니다. 이 후속 검토는 반영하지 않았습니다.` HTTP `revision.summary`와 같다. 이 행은 준비된 검토가 아니다. 추가 호출은 하지 않았다.

프로젝트 `3a5fc4a0-2e90-45e6-8370-350beda67342`. 검토 행에는 프로젝트 ID가 없다.

| 항목 | 판정 |
|---|---|
| 실행 SHA | **기록** — `ccca30c3e82d546c114bfe200c192d81df605a5a`, build-info HTTP 200 |
| 구조화된 요청과 비교 게이트 | **기록** — 거절된 응답은 준비된 검토가 아님 |
| 회귀 테스트 | **PASS** — 6버전 문장 거절, 재확인 형태 통과, 재호출 없음. 테스트 15개 |
| 후속 호출 1회 | **PASS** — `62b5588c-0d11-42c8-8fac-d24d25dc4f20`, `gpt-4o-mini-2024-07-18`, 797/192/989, `callCount` 1 |
| 잘못 이해한 내용을 확정 사실로 반복하지 않음 | **FAIL** — 고객, 수익 가설이 5버전과 같음 |
| 빠진 핵심을 다음 질문이 확인 | **FAIL** — `어떤 방식으로 양조장과의 파트너십을 구체화할 계획인가?` |
| 저장 근거와 응답 일치 | **기록** — 행의 `revisionGate.summary`와 HTTP `revision.summary`가 같음 |
| 후속 검토 게이트 | **BLOCKED** |
| Production | **잠금 유지** |
