# AI 통신 구조와 판단 정확도 검토 — 2026-10-16

작성: 2026-10-16 19:40 KST.  
이번 문서는 저장소에 있는 증거와, 같은 날 다시 실행한 기존 테스트만 사용한다. 새 모델 호출, 무인증 공식 API 재호출, 제품 코드 수정, 엔진 순서 변경, 병합, Production 배포는 없다. 비용은 0원이다.

1단계 통신 관문은 이 보고로 열리지 않는다. 2단계와 3단계는 착수하지 않는다.

## 1. 통신 경로

| 경로 | 제공 모델·주소 | 인증 | 요청 | 저장된 응답 | 실패 | 비용 | 재현 | 이용 조건 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 익명 텍스트 | 응답 모델 `gpt-oss-20b`. `GET /models` 설명 `GPT-OSS 20B Reasoning LLM (OVH)`. 별칭 `openai`. `POST https://text.pollinations.ai/openai` | 익명. Authorization 없음 | `Content-Type: application/json`. 모델 칸 `openai`. `stream` false | HTTP 200 원문은 `experiments/external-ai-roundtrip/last-run.json`, `experiments/comm-structure-repeat/external.json`, `experiments/method-feedback/method1.json`, `experiments/business-judgment-poc/path1.json`, `experiments/comm-structure-repeat/boundary-2026-10-16.json`, `experiments/comm-structure-repeat/interval-2026-10-16.json` | 상태 없는 시간 초과 2회. EXT-PING-2 45.091초. INTERVAL-8 45.113초. HTTP 401·403·402는 이 표본에 없음 | 받은 응답의 결제 헤더 없음. 관측 비용 0원. 시간 초과 건은 헤더가 없어 그 요청의 과금은 확인 불가 | 프로토콜마다 따로 센다. 확장 1/1 200. 마커 3회 중 2회 200. 간격 0초 3/3 200. 30초 간격 최초 8회 중 7회 200 (87.5%). RETRY-1 200은 최초 성공률에 넣지 않음 | Classic API 문서. IP당 하나, 최소 30초, 초과 시 402. 가동 보장 없음. 반복·에이전트 사용은 키를 권함. 실험용. GPT·Gemini 아님 |
| 로컬 Ollama | `qwen2.5:3b` 또는 `qwen2.5:7b`. `POST http://127.0.0.1:11434/api/chat` | 로컬. 인증 없음 | JSON chat. 사업 호출은 temperature 0 | 핑 `experiments/comm-structure-repeat/local.json`. 사업 JSON `experiments/business-judgment-poc/path4.json`. 긴 호출 기록은 `PATH-COMPARISON.txt`, `CPO-REVIEW-PACKAGE.txt` | 핑 3회의 HTTP 오류 없음. 사업 품질 실패는 통신 실패가 아님 | API 청구 없음. 라벨 `local_runtime_no_api_invoice` | 마커 핑 3/3 HTTP 200. 외부 AI 아님 | 이 머신의 로컬 런타임. 운영 외부 경로 아님 |
| Gemini 공식 | `gemini-2.0-flash`. `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` | 키 없음. Authorization 없음 | Content-Type 만 | HTTP 403 `PERMISSION_DENIED`. 모델 문장 없음. `experiments/multi-ai-roundtrip/gemini-unauth.json` | 인증 거절 1회. 성공 0 | 0원. usage 없음 | 성공 재현 없음. 같은 403은 반복하지 않음 | 키가 필요. 웹 `/app/` `/chat/` 는 열지 않음 |
| GPT 공식 | 요청 모델 칸 `gpt-4o-mini`. `POST https://api.openai.com/v1/chat/completions` | Authorization 없음 | 키 없는 POST | HTTP 401. `x-request-id req_28fcf4c53fe34b129733afd7a199dbdc`. `experiments/gpt-roundtrip/api-unauth.json` | 인증 오류 1회. 마커 없음 | 0원 | 성공 재현 없음. 같은 401은 반복하지 않음 | 키가 필요 |
| Claude 공식 | 요청 모델 칸 `claude-3-5-haiku-latest`. `POST https://api.anthropic.com/v1/messages` | `x-api-key` 없음 | 키 없는 POST | HTTP 401. `req_011Cg5PNpXVVcm9mLXUfwr25`. `experiments/multi-ai-roundtrip/claude-unauth.json` | 인증 오류 1회 | 0원 | 성공 재현 없음 | 키가 필요 |
| GPT 웹 | 프로그램 주소 없음 | 세션 없음. 쿠키 호스트는 Vercel뿐 | 프로그램 요청 없음 | 완료 원문 없음. 사람이 붙여 넣은 분석은 재분석 원문이 아님 | 미실행 | 0원 | 미검증 | robots가 대화 자동화를 닫음. 불가능으로 단정하지 않음 |
| Gemini 웹 | 미개방 | 세션 없음 | 없음 | 없음 | 미실행 | 0원 | 미검증 | `/app/` `/chat/` Disallow |
| Chrome 내장 | `LanguageModel` | 해당 없음 | `prompt()` 미호출 | availability `unavailable`. 모델 문장 없음 | 인터페이스 없음 | 0원 | 성공 0 | 이 환경에서 실행 불가로 기록 |
| 제품 OpenRouter·OpenAI 클라이언트 | `https://openrouter.ai/api/v1/chat/completions`, `https://api.openai.com/v1/chat/completions` | Bearer 키 필요 | 코드만. `facce846` 등 | 이 스트림의 완료 원문 없음 | 호출 원문 없음 | 확인 불가. 전송 기록이 없음 | 미검증. `LIMITED-MODEL-CALL-CONTRACT.md` S8 | 키 없는 성공 경로가 아님 |

실행 파일. 외부에서 모델 본문이 남은 스크립트는 `experiments/external-ai-roundtrip/extension/background.js` 와 `run-poc.mjs` (`8b5e2164`)뿐이다. 이후 urllib 호출의 스크립트는 간격 검증 원문에 러너 이름만 남아 있다.

재현 가능한 성공. 로컬 마커 핑은 3/3이다. 외부에서는 익명 주소만 모델 문장을 돌려줬고, 30초 간격 최초 8회는 87.5%라 운영 경로가 아니다. Gemini·GPT·Claude의 재현 가능한 성공은 없다.

## 2. 무료 조건과 운영 제한

익명 `gpt-oss-20b` 는 실험용이다. 제품 운영 경로로 두지 않는다. GPT·Gemini로 표기하지 않는다.

운영 기준은 `ANON-OPS-LIMIT-2026-10-16.md`에 표본보다 먼저 적혀 있다. 최초 성공 99%와 50회 이상, 같은 본문의 재시도 1회. 이번 8회는 성공률과 재시도 기준에 미달한다. 200인 7회의 중앙값 8.597초만 지연 상한 15초 안에 있다.

Classic API 문서. 가동 보장 없음. 한도·모델·동작은 바뀔 수 있다. 반복 사용은 키를 권한다. 요청당 $0.01은 유료이며 쓰지 않았다. INTERVAL-8은 완료 id가 없다. 서버가 그 요청을 처리하지 않았다는 증거가 아니다. RETRY-1은 마커가 다른 새 요청이다.

키 있는 `gen.pollinations.ai` 문서의 동일 본문 재전송 규칙은 이번 익명 주소의 동작으로 적지 않는다.

새 통신 경로는 발견되지 않았다. 무의미한 성공률 반복은 하지 않았다.

## 3. 판단 정확도 실패 — 회귀 기준

새 정답은 만들지 않았다. 모델 호출은 다시 하지 않았다. 재현은 저장된 원문과, 오늘 다시 실행한 기존 테스트를 뜻한다.

### 1. `gpt-oss-20b` 가 A2·S3을 누락

- 입력. `experiments/business-judgment-poc/prompt.txt`. A1은 2,000만 원 비중이 모회사·계열사 판매라는 창업자 진술. A2는 모회사 지원이 필수라는 진술. S3는 모회사 공급 계약의 예상 연매출 10억 문장. 원장 증거가 아니다.
- 기준. Fact는 원장이나 결제 증거가 있을 때만 true. A2와 S3의 예상 매출이 출력에 있어야 구분된 것이다. 10억을 받은 매출로 쓰면 실패다.
- 출력. `experiments/business-judgment-poc/path1.json`. 2026-10-16T07:32:42Z. HTTP 200. id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36`. Fact false. Claim은 A1만. A2와 S3 예상 매출은 없다.
- 실패 조건. JSON 파싱은 됐다. 구분 누락은 남았다.
- 재현. 저장 원문으로 확인. 모델 재호출은 미실행.
- 검증기. 제품 테스트는 이 JSON을 읽지 않는다. `experiments/id-selection-validator/validator.py`는 사실·가설·미검증 칸을 보고, 이 파일에 대해 이번 턴에 실행하지 않았다. 미실행. 파싱 성공을 정확도로 세지 않는다.
- 오인 위험. Fact false와 스키마 성공만 보면 통과로 읽을 수 있다. 누락은 그 검사 밖에 있다.

### 2. `qwen2.5:3b` 가 원장 없이 Fact를 true로 올림

- 입력. 같은 프롬프트. 원장·결제 증거 없음.
- 기준. Fact true 금지.
- 출력. `experiments/business-judgment-poc/path4.json`. 2026-10-16T07:32:20Z. HTTP 200. Fact true. Claim이 A1과 A2를 합쳤고, Next_Action은 지원 없이도 유지할 증거를 찾으라고 해 Claim의 유지 불가와 방향이 반대다.
- 실패 조건. 파싱 성공. Fact 값이 기준과 다름.
- 재현. 저장 원문. 모델 재호출은 미실행.
- 검증기. 이 JSON을 제품 상태에 넣지 않았다. `recordExternalAnalysis`는 Fact 키를 읽지 않고 `verifiedFact`를 false로 고정한다. `apps/web/features/business-validation-journey/lib/judgment-development.ts`. 잘못된 Fact를 탐지해 실패로 남기는 검사가 아니라, 모델 칸을 무시한다. ID 선택 검증기는 이 파일에 대해 미실행.
- 오인 위험. 파싱 성공과 로컬 HTTP 200을 판단 통과로 읽으면 안 된다. 제품 상태에는 들어가지 않았으므로 승격된 사실은 없다.

### 3. V3-03

- 입력. 답 `음… 글쎄요`. 공백 `differentiationVsAlternatives`. 질문 `경쟁사 대비 차별점은 무엇인가요?`
- 기준. `v3-runtime-certification.test.ts`. review와 decision의 action이 `clarify`, 같은 공백.
- 오늘 실행. 2026-10-16T10:39:10Z. Vitest. `review.recommendedAction` 은 `clarify` 까지 통과. `decision.action` 은 `advance`.
- 실패 조건. 모호한 답이 같은 공백의 clarify가 아니라 다음으로 진행.
- 재현. 예. 제품 코드는 고치지 않음.
- 검증기. 이 테스트가 실패를 탐지한다. 스위트 전체를 통과로 보고하지 않는다.
- 오인 위험. review가 clarify인 것만 보면 decision의 advance를 놓친다.

### 4. V3-12

- 입력. 지불자, 문제, 고객 페르소나 순의 다회차. 마지막 문제 답 `콘텐츠 제작 시간`.
- 기준. `renderSurfaceFiveLines(whyAsk)[2]` 와 `decision.questionText` 가 같음.
- 오늘 실행. `decision.questionText` 는 `중소기업 마케팅팀이 가장 크게 겪는 불편은 무엇인가요?`. 화면 줄은 `같은 주제를 조금 더 구체화하면 GO/HOLD 판단 근거가 강해집니다.`
- 실패 조건. 결정의 질문 문장과 표면 줄이 다름.
- 재현. 예.
- 검증기. 이 테스트가 탐지한다.
- 오인 위험. 질문 문장만 보면 구체 질문이 있는 것처럼 보이고, 표면 줄은 일반 문장이다.

### 5. `validationTestability`

- 입력. 공백은 `validationTestability`. 답은 고객 타깃 정정 문장. `core-final-stabilization.test.ts`.
- 기준. quality `PARTIAL`, mergeable false.
- 오늘 실행. quality가 `VALID`. mergeable 단정은 그 앞에서 멈춰 미확인.
- 실패 조건. 약한 답이 PARTIAL이 아님.
- 재현. quality 불일치는 예. mergeable 결과는 이번 실행에서 미확인.
- 검증기. 이 테스트가 quality 불일치를 탐지한다.
- 오인 위험. `VALID` 를 그 공백이 닫힌 것으로 읽음.

## 4. 규칙 엔진 — 코드 변경 없이 본 범위

| 항목 | 이번 확인 | 업무 품질과의 구분 |
| --- | --- | --- |
| Fact와 Assumption | `plan-journey.ts` 마지막 수정 `134667d9`. S3–S6은 원문에 그 문장이 있을 때만 ASSUMPTION. Fact 상태 없음 | 로컬 테스트가 그 전이를 본다. 모델 문장의 사실성은 보지 않는다 |
| 근거 없는 Fact 승격 | `verifiedFact` 고정 false. 모델 Fact true는 상태로 들어가지 않음 | 차단은 무시로 이뤄짐. 잘못된 Fact를 실패 케이스로 남기는 제품 검사는 없음 |
| 누락된 핵심 수치 | 모델 출력의 A2·S3 누락을 읽는 규칙 없음 | 미실행. 저장 원문에만 누락이 있다 |
| 답변 반영 | 선택에 따른 다음 질문 테스트는 로컬 92건 안에 있음. 모델 재분석은 없음 | 모델 재분석 미실행 |
| 반복 후 이동 | `decide-next-question-from-review.ts` `134667d9`. 닫히지 않은 같은 공백 2회 후 양보 | 그 단위 테스트는 92건에 포함. V3-03의 advance는 따로 실패 |
| AI 출력과 규칙 상태 | 모델 JSON을 상태에 넣지 않음. 불일치를 비교한 실행은 없음 | 미실행. 넣을 경로가 이번 작업에서 열리지 않음 |

엔진 순서. `verification-action.ts` 의 마지막 수정은 `b6bb8443`. 화면만 `present-single-action.ts` `55586a62` 가 첫 블록을 보여 준다. 이번 작업에서 순서를 바꾸지 않았다.

로컬 검사. 2026-10-16T10:39:31Z. `plan-journey` + `present-single-action` + `ai-pm-loop-v3` 3개 파일, 92건 통과. 같은 시각의 인증 3건은 실패다. 92건 통과는 V3-03, V3-12, `validationTestability` 의 통과가 아니다.

ID 선택 검증기. 이전 네 출력의 형식 실패는 `ID-SELECTION-VALIDATOR.txt`에 있다. 그 탐지를 사업 판단 통과로 세지 않는다. path1·path4에는 연결되지 않았다.

## 5. 동결

| 항목 | 확인 |
| --- | --- |
| 제품 코드 동결 `6f71ea3a` | `6f71ea3a..HEAD` 의 `apps/` `packages/` diff는 비어 있다. 그 이후 커밋은 문서와 실험 원문이다 |
| 엔진 순서 | 위 파일 SHA. 이번 커밋에 포함하지 않음 |
| Production `0b465226` | HEAD의 조상. 배포하지 않음 |
| PR #199 | 초안. 병합하지 않음 |
| 비용 | 0원. 키 발급 없음. 새 GPU·서버 없음 |

## 6. 관문

1단계. 닫힘. 외부 재현 성공은 익명 `gpt-oss-20b` 뿐이고, 최초 8회 성공률 87.5%와 가동 보장 없음이 운영 기준에 미달한다. Gemini·GPT 성공 원문은 없다.

2단계. 착수하지 않음. 1단계가 승인되지 않았다. 실패 다섯 건은 회귀 기준으로 적어 두었고, 규칙을 고치지 않았다.

3단계. 착수하지 않음.

다음 작업 제안. 익명 핑을 더 모으지 않는다. 1단계가 따로 승인되기 전에는 모델 출력 검사기를 제품에 넣지 않는다. 승인 뒤에 볼 회귀는 저장된 path1의 A2·S3 누락, path4의 Fact true, V3-03의 decision advance, V3-12의 질문 문장 불일치, `validationTestability` 의 VALID다.

## 7. 미실행·미확인

- Gemini·GPT·Claude 무인증 재호출. 하지 않음.
- GPT·Gemini 웹 왕복. 미실행.
- path1·path4 모델 재호출. 미실행.
- ID 선택 검증기를 path1·path4에 실행. 미실행.
- 모델 JSON을 규칙 상태와 비교. 미실행.
- `validationTestability` 의 mergeable 값. 이번 실행에서 단정 전에 중단. 미확인.
- INTERVAL-8이 서버에서 생성됐는지. 확인 불가.
- 약관 HTML의 조문. 이전 조회에서 본문이 없었음. 이번 턴에 다시 열지 않음. Classic API 문서의 한도는 이전 기록과 `ANON-OPS-LIMIT-2026-10-16.md`를 사용.
