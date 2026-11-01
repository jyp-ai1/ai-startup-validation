# Sprint 2 실 GPT 비교

2026-11-01 09:43 KST. PR #226. 기준 커밋 `ed5fa67e` 위의 실행이다. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다.

실행 기록: `docs/evidence/ALABOM/AI-PM/sprint-2-live-quality-comparison.json`  
요청 원문: `docs/evidence/ALABOM/AI-PM/sprint-2-quality-2-15-requests.json`

## 실행

`executeWholeBusinessCompare({})`를 한 번 호출했다. 반환은 `NOT RUN`, 사유 `GPT_API_KEY missing`이다. `productFollowUpInvoked`는 false다. HTTP 시도는 0회다. 두 호출의 `raw`는 null, `model`은 null, 토큰은 null, `error`는 null이다.

프롬프트 SHA-256은 저장된 요청 원문과 같다.

| 버전 | 상태 | 요청 형식 | raw |
| --- | --- | --- | --- |
| quality-2 | not_run | json_schema | null |
| quality-15-whole-business | not_run | json_object | null |

함수 기록의 `reportResponseFormatLabel`은 `json_object`다. 이 값은 쌍 라벨이다. quality-2 요청의 형식은 `json_schema`이고, 이 라벨이 요청을 바꾸지는 않는다. 모델은 요청값 `gpt-4o-mini`, temperature 0.2, maxTokens 2400이다. 실제 응답 모델명은 없다.

`openAIChat`은 `fetch` 한 번이다. 재시도 루프는 없다. `executeWholeBusinessCompare`에는 수리 호출이 없다. 이번 실행은 키가 없어 그 `fetch`에 들어가지 않았다.

## 환경 장애

이 프로세스의 `GPT_API_KEY`와 `OPENAI_API_KEY`는 없다. `VERCEL_TOKEN`도 없다. Vercel CLI와 `~/.vercel`이 없다. 저장소에는 `.env.example`만 있고 `.env`는 없다. Cursor environment 설정은 owner-restricted라 비밀을 읽지 못했다. egress는 제한이 없다. 막힌 지점은 네트워크가 아니라 키 부재다.

제품 경로와 Founder 프로젝트에는 행을 넣지 않았다. 응답을 만들지 않았다. 시뮬레이션 원문은 없다.

## 평가표

원문이 없어 다섯 기준은 모두 NOT RUN이다. 필드 개수와 응답 길이로 판정하지 않았다.

| 기준 | quality-2 | quality-15-whole-business |
| --- | --- | --- |
| 사업 전체 구조 이해 | NOT RUN | NOT RUN |
| 고객·문제·제품·공급 연결 | NOT RUN | NOT RUN |
| 고객 확보 및 마케팅 구조 | NOT RUN | NOT RUN |
| 운영과 수익 구조 연결 | NOT RUN | NOT RUN |
| 핵심 가설 및 위험 식별 | NOT RUN | NOT RUN |

## 후속 검증

최초 분석 비교가 끝나지 않았다. Founder 답변을 사용한 단계 재분석은 시작하지 않았다.

비교 원문이 생기면 다음을 본다. 기존 판단의 유지 또는 변경, 변경 이유, 해결된 문제, 미해결 문제, 다음 검증의 구체성. 시뮬레이션을 쓸 경우 표시는 SIMULATION이다. 이번 기록에는 그 원문이 없다.

## 다시 실행하는 조건

`GPT_API_KEY`가 있는 비프로덕션 프로세스에서 `executeWholeBusinessCompare`를 한 번 실행한다. 각 요청은 그 한 번만 보낸다. 실패하면 원문과 오류를 저장하고 다시 호출하지 않는다. 응답을 고치지 않는다. Founder 프로젝트에 행을 넣지 않는다. 제품 경로는 바꾸지 않는다.
