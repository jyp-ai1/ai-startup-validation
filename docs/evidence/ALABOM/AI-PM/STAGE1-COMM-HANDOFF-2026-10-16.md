# 1단계 인수 — AI 통신 재현성과 안정성 — 2026-10-16

작성: 2026-10-16 18:40 KST  
근거: 저장소에 이미 있는 증거 파일과 `git` 기록. 이번 턴에 모델 호출, 제품 코드 수정, 엔진 순서 변경, PR #199 병합, Production 배포는 없다.  
비용: 0원. 키 발급 없음.

CPO 1차 검토의 인수 자료다. Gemini 작업을 이어서 구현하지 않는다. 2단계(규칙 무결성 추가 수정)와 3단계(실제 사용자 여정 구현)는 열지 않는다.

## 경계

| 이름 | SHA | 이 기록에서 한 일 |
| --- | --- | --- |
| 제품 코드 동결 | `6f71ea3a` | 그 커밋과 그 다음 `8987c34c`는 문서만 바꿨다. 제품 코드의 마지막 변경은 `55586a62`(화면)와 `134667d9`(규칙)다. |
| Production 잠금 | `0b465226` | `HEAD`의 조상이다. 이 브랜치가 Production을 바꾸지 않았다. |
| 이번 인수 | 문서 1개와 `docs/TASKS.md` 한 줄 | 제품 코드 없음 |

`6f71ea3a`와 `0b465226`은 다른 커밋이다. 보고 문서가 늘어도 Production 잠금은 그대로다.

## 검토 자료 유무

| CPO가 요청한 자료 | 저장소 상태 |
| --- | --- |
| Gemini 대화 내보내기 또는 핵심 대화 원문 | 없다. 파일명·본문 검색에서 Gemini 대화 내보내기는 0건이다. 있는 Gemini 원문은 `experiments/multi-ai-roundtrip/gemini-unauth.json` 한 건이고, 본문은 403 오류다. 모델 문장이 아니다. |
| 붙여 넣은 Gemini 점수표 | `docs/evidence/ALABOM/AI-PM/AI-BROWSER-OPTIONS.txt`가 측정값으로 채택하지 않았다고 적혀 있다. 이 인수도 그 표를 점수로 쓰지 않는다. |
| `CPO-ABSENCE-BRIEF-2026-10-16.md` | 있다. `8987c34c`. 그 파일이 적을 때의 헤드는 `6f71ea3a`였다. 그 다음 커밋이 보고 자체다. |
| `FINAL-VALIDATION-SUMMARY.md` | 있다. `6f71ea3a`. |
| AI 통신 증거 | 아래 경로 표의 파일. |
| 최근 커밋과 diff | 이 문서 하단. |
| 로드맵과 미완료 목록 | `docs/ROADMAP.md`에는 ALABOM·사업성·규칙 엔진·Closed Alpha 항목이 없다. 살아있는 미완료 목록은 `docs/TASKS.md` 상단 「순수 규칙 엔진」절이다. |

이전 에이전트 대화 ALABOM2 `bc-4e4afb06-edea-4f70-8f23-84ee372f6423`, ALABOM3 `bc-976e45a4-88c8-443f-9bb2-5c09b860e648`에는 모델 응답 본문이 0건이다. 근거는 `docs/evidence/ALABOM/AI-PM/AI-COMM-STRUCTURE.txt`. 수동 GPT 1차 분석은 Cursor에 사람이 붙여 넣은 메시지다. 프로그램이 받은 GPT 완료 원문이 아니고, 재분석으로 재사용하지 않는다. 근거는 `docs/evidence/ALABOM/AI-PM/GPT-USAGE-PATH-TRACE.txt`.

`docs/TASKS.md`의 더 아래 행 가운데 OpenRouter `google/gemini-2.5-flash`를 끝낸 것으로 적은 줄이 있다. 그 줄은 이번 통신 실험의 성공 원문이 아니다. 이번 스트림의 Gemini 원문은 403 JSON뿐이다.

## 경로별 통신 증거

같은 경로를 이번 턴에 다시 호출하지 않았다. 반복 횟수는 이미 저장된 표본이다.

| 경로 | 요청 | 인증 | 비용 | 저장된 결과 | 반복 | 1단계에서의 위치 |
| --- | --- | --- | --- | --- | --- | --- |
| Gemini 공식 | 2026-10-16T05:45:41Z POST `generativelanguage.googleapis.com/.../gemini-2.0-flash:generateContent`. Content-Type만. | API 키 없음. Authorization 없음. gemini.google.com 세션 없음. `/app/`, `/chat/` 미개방. | 0원. usage·청구 필드 없음. | HTTP 403 `PERMISSION_DENIED`. 마커 `ALABOM-ROUNDTRIP-001` 없음. `experiments/multi-ai-roundtrip/gemini-unauth.json` | 성공 반복 0. 같은 403을 다시 받지 않음. | 재현 가능한 성공 경로가 아니다. |
| Gemini 웹 | 요청 원문 없음 | 세션 없음 | 0원 | 응답 원문 없음 | 미실행 | 성공으로 세지 않는다. |
| GPT 공식 | 2026-10-16T05:30:38Z POST `https://api.openai.com/v1/chat/completions`. 모델 칸 `gpt-4o-mini`. Authorization 없음. | 키 없음. chatgpt.com 세션 없음. | 0원 | HTTP 401. `x-request-id req_28fcf4c53fe34b129733afd7a199dbdc`. 마커 `GPT-POC-TEST-001` 없음. `experiments/gpt-roundtrip/api-unauth.json` | 같은 401을 새 마커로 반복하지 않음. `experiments/multi-ai-roundtrip/gpt-not-repeated.json`은 `sent: false`. | 재현 가능한 성공 경로가 아니다. |
| GPT 웹 | 프로그램 요청 없음 | 이 환경 쿠키 호스트는 Vercel뿐. chatgpt.com 쿠키 없음. | 0원 | 모델 완료 원문 없음. 사람 붙여넣기만 있음. | 미실행 | 웹 경로를 불가능으로 단정하지 않는다. 성공 증거도 없다. |
| 익명 텍스트 | POST `https://text.pollinations.ai/openai`. Authorization 없음. 응답 모델 필드 `gpt-oss-20b`. | `user_tier` anonymous. 키 없음. | 0원. Bearer를 붙이면 402가 되므로 성공 호출은 Authorization을 보내지 않았다. | 핑 원문 `experiments/comm-structure-repeat/external.json`. 사업 JSON `experiments/business-judgment-poc/path1.json`. | 핑 3회 중 2회 HTTP 200 (11.328초, 10.717초). 1회는 45.091초 `TimeoutError`, HTTP 상태 없음, 본문 없음. 시각 2026-10-16T06:31–06:32Z. | GPT·Gemini·Claude가 아니다. 3회 중 시간 초과 1회라 안정으로 두지 않는다. |
| 로컬 `qwen2.5:3b` | POST `http://127.0.0.1:11434/api/chat`. 인증 없음. | 세션 없음. 비용 라벨 `local_runtime_no_api_invoice`. | API 청구 0원. | 핑 `experiments/comm-structure-repeat/local.json`. 사업 JSON `experiments/business-judgment-poc/path4.json`. | 마커 핑 3/3 HTTP 200. 2026-10-16T06:31:26Z–06:31:34Z. | 외부 AI가 아니다. 핑 재현은 확인됐다. 업무 판단 품질은 그 핑이 증명하지 않는다. |
| Chrome 내장 Prompt API | 로컬 페이지만. `prompt()` 미호출. | 해당 없음 | 0원 | 2026-10-16T07:22:28Z. `LanguageModel`는 함수. `window.ai` 없음. availability default/en/ko 모두 `unavailable`. | 모델 문장 0 | 통신 성공이 아니다. |
| Claude 공식 | 2026-10-16T05:45:41Z POST `https://api.anthropic.com/v1/messages`. `x-api-key` 없음. | 키 없음. claude.ai 미개방. | 0원 | HTTP 401. `request-id req_011Cg5PNpXVVcm9mLXUfwr25`. | 반복하지 않음 | Gemini·GPT 성공이 아니다. |

제품 코드의 OpenAI·OpenRouter 클라이언트(`packages/ai`)는 Bearer 키가 있어야 한다. 그 함수가 모델 본문을 받아 저장한 기록은 이 스트림에 없다. 호출 자리이지 성공 사례가 아니다.

## 업무 판단 출력 — 저장된 Fact 값

`docs/evidence/ALABOM/AI-PM/BUSINESS-JUDGMENT-DECISION.txt`와 `BUSINESS-JUDGMENT-POC.txt`.

| 경로 | 시각 | HTTP | Fact | 저장된 한계 |
| --- | --- | --- | --- | --- |
| 1번 `gpt-oss-20b` | 2026-10-16T07:32:42Z | 200, 10.876초, id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36` | false | A2와 S3 예상 매출이 출력에 없다. Claim은 A1만 복사했다. JSON 파싱 성공이다. |
| 4번 `qwen2.5:3b` | 2026-10-16T07:32:20Z | 200, 21.685초 | true | 원장·결제 증거가 없는 입력에서 창업자 진술을 사실로 올렸다. Next_Action은 지원 없이도 매출이 유지되는 증거를 찾으라고 해 Claim의 유지 불가와 방향이 반대다. |

1번이 Fact를 true로 올린 기록은 없다. 원장 없이 Fact를 true로 올린 저장 출력은 4번이다. 두 출력 모두 제품 상태에 넣지 않았다. `liveModelCall`, `verifiedFact`, `realAnalysisSuccess`, `systemVerified`는 false 고정이다.

## 이미 나무에 있는 개선과, 아직 통과로 두지 않는 항목

개선으로 기록된 범위. 이번 턴에 다시 고치지 않았다.

- S3–S6 문장은 원문에 있을 때만 ASSUMPTION이다. Fact 상태는 없다. `134667d9`.
- 같은 공백의 닫히지 않은 질문이 2회이면 다음 필수 공백으로 넘긴다. 첫 부분 답은 같은 공백을 한 번 더 묻는다. `134667d9`.
- 화면과 검증 메모는 엔진 문단의 첫 블록과 성공 기준만 보인다. LMULM 첫 행동은 주문 원장의 매출 분리. RIDM 첫 행동은 최초 결제 원문. `55586a62`. 채널 밖 고객 기록은 엔진의 세 번째 블록이라 화면에 없고, 그 순서는 바꾸지 않는다. `96f3c4a9`.

통과로 두지 않는 항목.

- JSON 파싱 성공은 업무 판단의 정확성이 아니다.
- 화면이 행동 하나로 좁혀진 것은 사용성이나 사업 검증 효과가 아니다.
- `v3-runtime-certification.test.ts`의 V3-03, V3-12와 `core-final-stabilization.test.ts`의 `validationTestability`는 실패로 남아 있다. `RULE-ENGINE-FREEZE.txt`가 그 실패를 기존 실패로 적었다. 로컬 plan-journey 16건, ai-pm-loop-v3 73건 통과와 별개다.
- 2단계의 원인 규명과 3단계의 증거 제출 후 분석 갱신은 이번 턴에 시작하지 않았다.

## 1단계 판정

1단계 완료 조건(비용 0원으로 재현 가능한 통신 경로와 그 한계가 증거로 확인됨)을 Gemini·GPT·익명 텍스트에는 적용해 통과로 두지 않는다.

확인된 것.

- 로컬 마커 핑은 3/3이고 비용 라벨은 로컬 런타임이다. 한계는 외부 AI가 아니고, 사업 JSON 1회는 Fact를 true로 잘못 올렸다. 그 사업 프롬프트는 반복하지 않는다.
- 익명 텍스트 핑은 3회 중 2회만 본문이 있고 1회는 시간 초과다. 한계는 불안정이고, 그 모델은 GPT가 아니다.
- Gemini 공식은 403 한 건이다. GPT 공식은 401 한 건이다. 둘 다 모델 문장이 없다. 웹 대화는 열지 않았다.

그래서 2단계와 3단계의 추가 구현과 배포로 넘어가지 않는다. 제품 코드, 엔진 순서, PR #199 병합, Production은 유지 대기 그대로다.

## `02a319ea` 이후 `6f71ea3a`까지의 제품 파일

```
apps/web/features/business-validation-journey/components/validation-journey-screen.tsx
apps/web/features/business-validation-journey/lib/journey-types.ts
apps/web/features/business-validation-journey/lib/plan-journey.ts
apps/web/features/business-validation-journey/lib/present-single-action.ts
apps/web/features/business-validation-journey/lib/verification-document.ts
apps/web/features/business-validation-journey/lib/__tests__/plan-journey.test.ts
apps/web/features/business-validation-journey/lib/__tests__/present-single-action.test.ts
apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts
apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts
```

9 files, +403 / −20. `6f71ea3a..8987c34c`는 `docs/TASKS.md` 1줄과 `CPO-ABSENCE-BRIEF-2026-10-16.md`뿐이다.

같은 구간의 증거 문서: `BUSINESS-JUDGMENT-DECISION.txt`는 `02a319ea`에 있다. 그 이후는 `RULE-ENGINE-AC16-AC5.txt`, `RULE-ENGINE-FREEZE.txt`, `DIAGNOSTIC-UX-DIRECTION.txt`, `SINGLE-ACTION-SCREEN.txt`, `SINGLE-ACTION-FREEZE.txt`, `FINAL-VALIDATION-SUMMARY.md`, ADR은 `docs/DECISIONS.md`의 ADR-057(상태 Proposed).

## 미완료로 두는 일

1. Gemini 대화 내보내기. 저장소에 없어 인수할 원문이 없다.
2. Gemini·GPT의 비용 0원 재현 성공. 저장된 공식 결과는 403과 401이다.
3. 익명 텍스트의 안정. 저장된 반복은 2/3이다.
4. V3-03, V3-12, `validationTestability`의 원인. 이번 턴에 조사·수정을 열지 않는다.
5. 증거 제출 후 분석과 다음 질문이 바뀌는 3단계 여정. 화면의 첫 행동 문장만 있다.
6. S2 구매전환율은 주장 노드가 아니다. 엔진의 채널 밖 고객 문장은 세 번째다.
