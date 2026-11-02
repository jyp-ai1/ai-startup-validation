# Sprint 2 — 실제 GPT 통합 검증

2026-11-02 11:00 KST. 기준 커밋 `54883d78bbfeb24b7b87af2643f3d2bcba1c7b47`. 실행 브랜치 `cursor/sprint2-e2e-live-gpt-759f`.

이 프로세스의 `GPT_API_KEY`는 PRESENT다. 제품 경로로 호출 3회를 보냈다. 3차 저장 상태가 succeeded가 아니라 4차는 보내지 않았다. Sprint 2 PASS는 선언하지 않는다. Production은 잠금이다.

## 1. 실행

| 항목 | 값 |
| --- | --- |
| 어댑터 | `OpenAIProviderAdapter` |
| 제품 경로 | `runFirstReview` 후 `submitConsultingStage` → `runStageReanalysis` |
| 요청 모델 | `gpt-4o-mini`. 요청의 model은 바꾸지 않음 |
| 응답 모델 | `gpt-4o-mini-2024-07-18` |
| 본문 | `COMPARE_BUSINESS_BODY` |
| 사용자 / 프로젝트 | `e2e-live-user` / `e2e-live-brewery` |
| origin / evidence | `typed` / `live_network` |
| 저장 | `/tmp` sqlite. `productionDatabase` false. 실행 후 파일 삭제 |
| 호출 | 3. 상한 4. 재시도 0 |
| 3차 이후 | 저장 상태가 succeeded가 아니어서 중단. 4차 NOT RUN |

`openReviewChat`은 쓰지 않았다. `OPENAI_API_KEY`와 `GOOGLE_AI_API_KEY`로 대체하지 않았다. 프롬프트, SQL, Supabase, Vercel, Production은 건드리지 않았다. Founder 프로젝트 `3a5fc4a0-2e90-45e6-8370-350beda67342`와 사용자 `37d541c8-fda7-4788-8ac2-1a449b00425c`는 쓰지 않았다.

2차에서 선택지가 있는 질문의 기존 id는 `c4`다. 라벨은 `아직 핵심을 정하지 못했다`. 3차의 두 질문에는 `아직` 라벨이 없어, 각 질문에 이미 있던 첫 id를 보냈다. `q1`은 `c1` `설문조사 실시`, `q2`는 `c1` `비용 분석`이다. 없는 id를 `c1`으로 만들지 않았다. 미연결 문장 `SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다.`는 처음 완료된 제출인 2차에만 넣었다.

## 2. 여섯 연결

사업 판단이 맞는지, 고른 질문이 전략적으로 맞는지는 보지 않았다.

| 확인 | 판정 | 저장된 요청 또는 행의 문장 |
| --- | --- | --- |
| 1. GPT가 이전 사업 내용을 전달받았는가 | PASS | 2·3차 `originalInput`: `다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는` |
| 2. 이전 질문과 창업자 답변을 함께 전달받았는가 | PASS | 2차 `stagePairs`: `양조장과의 협업을 위한 초기 미팅에서 어떤 사항을 논의해야 할까?` / `아직 핵심을 정하지 못했다` |
| 3. 현재 답변을 누락하지 않았는가 | PASS | 2차 `unlinkedStatements`: `SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다.` 3차 `stagePairs`의 선택 id는 `q1` `c1`, `q2` `c1` |
| 4. 이전 대화에 이어 피드백과 다음 질문을 반환했는가 | PASS | 2차 응답: `사업의 방향성이 불확실하여 성공 가능성이 낮아졌다. 고객층을 명확히 정의하고 체험 프로그램의 구체적인 내용을 설정하는 것이 필요하다.` / `전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까?` |
| 5. 그 응답이 저장되어 다음 라운드로 전달됐는가 | PASS | 1차 다음 질문 `양조장과의 협업을 위한 초기 미팅에서 어떤 사항을 논의해야 할까?`가 2차 요청에 있다. 2차 다음 질문이 3차 `stagePairs`의 질문으로 있다 |
| 6. 4차에서도 최초 사업 아이디어가 유지되는가 | NOT RUN | 4차 요청 없음 |

3차 응답도 판단 문장과 다음 질문을 반환했다. 저장 오류는 `stage_judgment_copied,stage_questions_repeated`다. 그 행은 저장됐고, 다음 라운드로는 넘기지 않았다.

오래된 분석 요약은 빠지지 않았다. 2차 요청의 `priorAnalyses`는 0이고, 그 시점에 stage 답 행도 0이다. 3차 요청의 `priorAnalyses`는 1이고, succeeded stage 답 행도 1이다.

## 3. 라운드

| 차수 | reviewId | parentReviewId | 상태 | error | 모델 | 토큰 prompt / completion / total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `48d06eaa-ad74-4851-a919-fbd8ecefdc1a` | 없음 | succeeded | 없음 | `gpt-4o-mini-2024-07-18` | 3,692 / 820 / 4,512 |
| 2 | `5f6d705d-fe2a-468f-97be-da16482abd32` | `48d06eaa-ad74-4851-a919-fbd8ecefdc1a` | succeeded | 없음 | `gpt-4o-mini-2024-07-18` | 15,761 / 1,121 / 16,882 |
| 3 | `0e75ff46-88fd-4ce2-b567-bdc3f3048531` | `5f6d705d-fe2a-468f-97be-da16482abd32` | failed | `stage_judgment_copied,stage_questions_repeated` | `gpt-4o-mini-2024-07-18` | 16,807 / 1,473 / 18,280 |
| 4 | 없음 | 없음 | NOT RUN | 없음 | 없음 | 없음 |

응답 id는 `chatcmpl-EfbcrQpUVxRPscMIoGFW8XSp23wkN`, `chatcmpl-Efbcz1CJivX9bOCzdUXBBezft1rG2`, `chatcmpl-Efbd9RroEWRZwQtaeBwxSkYw9Vm74`다. finishReason은 모두 `stop`이다.

저장소가 보고한 토큰 합은 prompt 36,260, completion 3,414, total 39,674다. `usageKnown`은 true다. 이 숫자는 저장 행의 제공자 사용량이고 청구서가 아니다.

원문 요청과 응답은 `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json`이다.

## 4. 로드맵

| 단계 | 상태 |
| --- | --- |
| Sprint 1 — Core Engine | PASS (기존 선언 유지) |
| Sprint 2 — Consulting Continuity | 실제 GPT 3회 후 3차 저장 실패로 중단. PASS 선언 없음 |
| Sprint 3 — Founder Journey & UI/UX | WAITING |
| Sprint 4 — Data Integrity & History | WAITING |
| Sprint 5 — End-to-End Validation | WAITING |
| Sprint 6 — Reliability & Beta Readiness | WAITING |
