# 익명 경로 간격 검증 — 2026-10-16

호출 전에 정한 목적. 같은 주소, 같은 요청 형식, 사업 문장 없이, 응답이 끝난 뒤 30초를 두고 8회를 보내 성공률과 지연을 남긴다. 본문 없는 끊김과 HTTP 오류를 나눈다. 자동 재시도는 없다. 상태 없는 시간 초과 또는 HTTP 5xx 가 있으면 30초를 더 기다린 뒤 새 마커로 한 번만 다시 보낸다. 401·402·403 이면 그 자리에서 멈춘다. Authorization 은 보내지 않는다. 이 실행으로 1단계 관문을 열지 않는다.

제품 코드, 엔진 순서, 병합, Production 은 바꾸지 않았다. 비용은 0원이다.

원문. `experiments/comm-structure-repeat/interval-2026-10-16.json`  
모델 목록. `experiments/comm-structure-repeat/models-2026-10-16.json`

## 반복 결과

주소 `POST https://text.pollinations.ai/openai`. 요청 모델 칸 `openai`. `stream` false. 마커만 있는 연결 문장. 클라이언트 읽기 제한 45초.

| 호출 | 시작 UTC | 직전 종료 후 | HTTP | 초 | 구분 | id |
| --- | --- | --- | --- | --- | --- | --- |
| INTERVAL-1 | 09:45:25 | 첫 호출 | 200 | 8.597 | 마커 있음 | `pllns_63d0d6af0ea4c3685feb4cbdfa43a86a` |
| INTERVAL-2 | 09:46:04 | 30.0초 | 200 | 10.284 | 마커 있음 | `pllns_c3df61d9c86f97106cff8faec04666de` |
| INTERVAL-3 | 09:46:44 | 30.0초 | 200 | 8.152 | 마커 있음 | `pllns_b4c1c1c79e127769a19412429f18b217` |
| INTERVAL-4 | 09:47:22 | 30.0초 | 200 | 7.742 | 마커 있음 | `pllns_6c2dc8380b45ea8584362eef16b3413e` |
| INTERVAL-5 | 09:48:00 | 30.0초 | 200 | 8.941 | 마커 있음 | `pllns_8db75f4493a3369e64c1b36c74b3ec14` |
| INTERVAL-6 | 09:48:39 | 30.0초 | 200 | 9.364 | 마커 있음 | `pllns_344dcdf00113cf3f1bb018d126d0e864` |
| INTERVAL-7 | 09:49:18 | 30.0초 | 200 | 8.002 | 마커 있음 | `pllns_334ebb1bcacaa2ec8814831c582fd0d7` |
| INTERVAL-8 | 09:49:56 | 30.0초 | 없음 | 45.113 | 본문 없음. `TimeoutError: The read operation timed out` | 없음 |
| RETRY-1 | 09:54:14 | 30.002초 | 200 | 7.164 | 새 마커. 시간 초과 뒤의 한 번 | `pllns_e565b914cb92a7ec0820530674d5516b` |

간격 8회 중 HTTP 200 은 7회, 상태 없는 시간 초과는 1회, HTTP 오류는 0회다. 200인 7회의 지연은 최소 7.742초, 중앙값 8.597초, 최대 10.284초다. 성공 7회와 재시도 1회의 `user_tier` 는 anonymous, 응답 모델과 `x-model-used` 는 `gpt-oss-20b`, Cloudflare 위치는 PDX, `Payment-Required` 는 없다.

INTERVAL-8 의 `ended` 시각은 09:53:44Z 로, 기록된 45.113초보다 벽시계 간격이 길다. 분류는 그 시각 차이가 아니라 빈 본문, HTTP 상태 없음, `TimeoutError` 문자열을 따른다.

## 시간 초과 처리

이번 실행에서 HTTP 4xx·5xx 는 없었다. 402 도 없었다.

시간 초과 1건은 완료 id 가 없다. 그래서 재시도가 같은 완료를 두 번 받은 기록은 없다. RETRY-1 은 새 POST 이고 id 가 다르다. 결제 헤더와 Authorization 은 없다. 익명 응답의 usage 토큰은 청구 금액이 아니다. 재시도는 요청을 한 번 더 보낸 것이다.

## 무료 사용 조건

읽은 문서. `https://raw.githubusercontent.com/pollinations/pollinations/master/APIDOCS.md` (2026-10-16 조회).

그 문서의 텍스트 한도. 익명, 키 없음, IP 당 한 번에 하나, 최소 30초 간격. 한도를 넘으면 HTTP 402 와 `Retry-After`. 선택지는 키를 쓰거나, 다음 무료 슬롯을 기다리거나, 요청당 $0.01 을 내는 것이다. 가동 보장 없음. 한도·모델·동작은 바뀔 수 있다. 앱·에이전트·반복 사용은 enter.pollinations.ai 의 키를 쓰라고 적혀 있다.

이번 8회는 그 30초 간격을 지켰다. 402 는 오지 않았다. $0.01 결제와 키는 쓰지 않았다. 직전 조사의 간격 0초 3회도 402 가 아니라 200 이었다. 문서의 402 규칙이 그때의 응답 형태는 아니었다.

`https://pollinations.ai/terms` 와 `https://old.pollinations.ai/terms` 는 이번 조회에서 약관 문장이 없는 HTML 이었다. `https://text.pollinations.ai/robots.txt` 는 크롤러 규칙이 아니라 로봇 배제 프로토콜을 설명하는 문장을 돌려줬다. 허용 범위는 APIDOCS 의 익명 텍스트 한도로 읽었다.

## 응답 식별

`GET https://text.pollinations.ai/models` HTTP 200. 2026-10-16T09:45:25Z.

목록의 이름 `openai-fast`. 설명 `GPT-OSS 20B Reasoning LLM (OVH)`. `tier` anonymous. 별칭 `openai`, `gpt-oss`, `gpt-oss-20b`, `ovh-reasoning`.

요청 칸의 `openai` 는 그 별칭이다. 응답 모델 `gpt-oss-20b` 는 OpenAI GPT 도 Gemini 도 아니다. 제공 경로는 Pollinations 익명 텍스트이고, 모델 설명은 OVH 의 GPT-OSS 20B 다.

## 관문

30초 간격 8회 중 1회는 본문 없이 끊겼다. 그 뒤 새 마커 1회는 200 이었고 결제 헤더는 없었다. 모델 이름과 별칭은 문서와 응답이 같다. 무료 한도 문장도 읽었다.

1단계 관문은 닫혀 있다. 이번 표본은 장기 안정이 아니고, HTTP 오류 응답은 관측되지 않았으며, 문서가 한도와 모델이 바뀔 수 있다고 적는다. 이 경로를 GPT 로 두지 않는다. 2단계와 3단계는 시작하지 않았다. 제품 코드 동결 `6f71ea3a` 와 Production 잠금 `0b465226` 은 그대로다.
