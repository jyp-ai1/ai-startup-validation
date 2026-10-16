# 기존 성공 경로 추적 — 2026-10-16

작성: 2026-10-16 18:42 KST  
이번 조사는 저장소의 스크립트, 커밋, 증거 원문을 직접 읽고, 익명 텍스트 경로만 마커로 다시 호출했다. 제품 코드, 엔진, 병합, Production은 바꾸지 않았다. 공식 Gemini·GPT·Claude 무인증 호출은 반복하지 않았다. 사업 문장은 다시 보내지 않았다. 비용은 0원이다. Authorization 은 보내지 않았다.

1단계 관문은 닫혀 있다. 2·3단계는 열지 않는다.

## 1. 저장소에서 찾은 실행 출처

모델 본문이 실제로 남은 외부 호출의 실행 파일은 하나다.

| 항목 | 값 |
| --- | --- |
| 주소 | `POST https://text.pollinations.ai/openai` |
| 코드 | `experiments/external-ai-roundtrip/extension/background.js` |
| 런처 | `experiments/external-ai-roundtrip/run-poc.mjs` |
| 커밋 | `8b5e2164` |
| 실행 환경 | Playwright가 띄운 Chrome 확장 서비스 워커. `host_permissions` 는 `https://text.pollinations.ai/*` 만. chatgpt.com, gemini.google.com, claude.ai, copilot.microsoft.com 은 열지 않는다. |
| 요청 | `Content-Type: application/json` 만. 모델 칸 문자열 `openai`. `stream: false`. |
| 최초 원문 | `experiments/external-ai-roundtrip/last-run.json`. 2026-10-16T05:19:09.939Z. HTTP 200. 6.526초. 응답 모델 `gpt-oss-20b`. `user_tier` anonymous. content `pong poc-1792127949939`. id `pllns_5233625b21c6ceb7097bb02767559865`. |

그 뒤의 익명 호출은 같은 URL·같은 JSON을 Python urllib 로 보냈다. 그 urllib 스크립트는 커밋되어 있지 않다. 확장 런처를 다시 실행하면 `last-run.json` 을 덮어쓰므로 이번 조사에서는 실행하지 않았다.

로컬 성공의 주소는 `POST http://127.0.0.1:11434/api/chat`, 모델 `qwen2.5:3b` 또는 `qwen2.5:7b`, 인증 없음, 비용 라벨 `local_runtime_no_api_invoice` 다. 호출 스크립트는 저장소에 없고, 원문은 `experiments/comm-structure-repeat/local.json` 과 `docs/evidence/ALABOM/AI-PM/PATH-COMPARISON.txt`, `CPO-REVIEW-PACKAGE.txt` 에 있다. 외부 AI가 아니다.

## 2. 코드만 있고 성공 본문이 없는 자리

| 자리 | 주소 | 저장소에서 확인한 것 |
| --- | --- | --- |
| `packages/ai/src/providers/openrouter-http.ts` | `https://openrouter.ai/api/v1/chat/completions` | `facce846` 가 클라이언트를 넣었다. `Authorization: Bearer` 가 필요하다. 그 커밋에 모델 완료 원문은 없다. |
| `packages/ai/src/providers/openai-http.ts` | `https://api.openai.com/v1/chat/completions` | 키 필요. 저장된 실행은 `experiments/gpt-roundtrip/api-unauth.json` 의 HTTP 401 뿐이다. |
| `packages/ai/src/validation/ai-client.ts` | OpenAI 와 `https://api.anthropic.com/v1/messages` | 같은 계열의 클라이언트다. 이번 스트림의 Claude 원문은 HTTP 401 이다. |
| `apps/web` 의 OpenRouter·OpenAI 엔드포인트 상수 | 위와 같은 두 주소 | 테스트와 계약 문자열이다. `docs/evidence/ALABOM/AI-PM/LIMITED-MODEL-CALL-CONTRACT.md` S8 은 실제 Gemini·GPT HTTP 를 미검증으로 둔다. 원장 표는 Gemini 슬롯에 실제 HTTP 클라이언트가 없다고 적는다. |
| `docs/TASKS.md` 의 OpenRouter Gemini Flash 체크 | `google/gemini-2.5-flash` | 이번 실험의 응답 원문이 아니다. |

Gemini 공식의 저장 원문은 `experiments/multi-ai-roundtrip/gemini-unauth.json` HTTP 403 뿐이다. GPT 웹의 실행 경로와 완료 원문은 없다. Chrome 내장 `LanguageModel` 은 `unavailable` 이고 `prompt()` 는 호출되지 않았다.

## 3. 익명 텍스트의 성공과 시간 초과

비교 원문 `experiments/comm-structure-repeat/external.json`. 세 요청의 차이는 마커 문자열뿐이다.

| 호출 | 시작 | 간격 | HTTP | 초 | 본문 |
| --- | --- | --- | --- | --- | --- |
| EXT-PING-1 | 2026-10-16T06:31:35Z | 첫 호출 | 200 | 11.328 | `pong EXT-PING-1`. id `pllns_31ddce3a973bacfb498c7d2c6cc43461`. CF-RAY `a4b5057f9ddaac0d-PDX`. prompt 토큰 327. |
| EXT-PING-2 | 2026-10-16T06:31:46Z | 직전 응답 `Date` 와 같은 초 | 없음 | 45.091 | 빈 본문. `TimeoutError: The read operation timed out`. CF-RAY 없음. |
| EXT-PING-3 | 2026-10-16T06:32:31Z | 시간 초과가 끝난 시각 | 200 | 10.717 | `pong EXT-PING-3`. id `pllns_84dd84b023f84efa4d284f3f2bacb6af`. CF-RAY `a4b506e009e9ac0d-PDX`. prompt 토큰 327. |

공통. 주소 동일. `authorization_sent` false. 모델 칸 `openai`. `stream` false. 사용자 메시지 한 개. 402 없음. 성공 둘의 `user_tier` 는 anonymous, 응답 모델은 `gpt-oss-20b`, Cloudflare 위치는 PDX 다. 짧은 입력에 prompt 토큰이 327인 것은 서비스가 붙인 앞부분이다. 두 성공의 그 값은 같다. 시간 초과 건은 서버 상태와 토큰이 없어 그 앞부분과 비교할 수 없다.

요청 차이로 시간 초과를 설명하지 못한다. 45.091초는 클라이언트 읽기 제한 45초에 맞다. 그 제한을 둔 스크립트는 저장소에 없다.

같은 주소의 다른 저장 성공. 확장 1회(위 표의 최초 원문), `experiments/method-feedback/method1.json` 의 `METHOD1-OK`(2026-10-16T07:22:45Z, 8.613초, id `pllns_e40dd4b787d63719d032a92dc89cb63c`), 사업 JSON 1회(Fact false, id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36`). 이 서비스는 GPT가 아니다.

## 4. 확인된 경로의 반복

경로가 마커 원문을 돌려준 기록이 있으므로, 같은 주소에 Authorization 없이 마커 세 번을 잇따라 보냈다. 클라이언트 제한은 저장된 시간 초과와 같은 45초다. 호출 사이 대기는 넣지 않았다. 원문 `experiments/comm-structure-repeat/boundary-2026-10-16.json`.

| 호출 | 시작 | 직전 종료 후 간격 | HTTP | 초 | content | id |
| --- | --- | --- | --- | --- | --- | --- |
| BOUNDARY-A | 2026-10-16T09:40:04Z | 첫 호출 | 200 | 8.125 | `pong` 다음 줄 `BOUNDARY-A` | `pllns_51851812f69b183e9c27896093cd6b18` |
| BOUNDARY-B | 2026-10-16T09:40:12Z | 0.0초 | 200 | 10.09 | `pong BOUNDARY-B` | `pllns_4dfa6d2d3af3ca3de24fe5d275b234e4` |
| BOUNDARY-C | 2026-10-16T09:40:22Z | 0.0초 | 200 | 8.876 | `pong BOUNDARY-C` | `pllns_8bc15e2c72ecbf28988f2f485e07b368` |

셋 다 `gpt-oss-20b`, anonymous, CF-RAY 위치 PDX, prompt 토큰 326, 마커는 content 안에 있다. 직전 응답 직후의 호출이 시간 초과로 재현되지는 않았다.

같은 문장 틀의 연결 시험은 확장 1회, EXT-PING 3회, BOUNDARY 3회다. HTTP 200 은 6회, 본문 없는 클라이언트 시간 초과는 1회다. 그 1회의 서버 원인은 응답이 없어 남지 않았다.

## 5. 관문

외부 AI로 모델 문장이 돌아온 허용 경로는 이 익명 주소뿐이다. 주소와 실행 파일과 인증 없음은 확인됐다. 같은 요청을 바로 이어서 보내도 이번 3회는 시간 초과가 없었다.

그래도 관문을 열지 않는다. 이전 동일 요청 3회 중 1회는 HTTP 상태 없이 끊겼고, 그 원인은 요청 차이로 설명되지 않는다. 응답 모델은 GPT·Gemini·Claude 가 아니다. 사업 JSON 에서 이 경로의 Fact 는 false 였고 A2·S3 은 빠졌다. 로컬 3B 는 Fact 를 true 로 올렸다. 그 품질 기록은 바꾸지 않았다.

2단계와 3단계는 시작하지 않았다. 제품 코드 동결 `6f71ea3a` 와 Production 잠금 `0b465226` 은 그대로다.
