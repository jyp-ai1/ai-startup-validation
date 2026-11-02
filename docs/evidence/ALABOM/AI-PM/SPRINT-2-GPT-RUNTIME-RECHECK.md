# Sprint 2 GPT 런타임 재확인

**판정:** Sprint 2 PARTIAL. 4차는 NOT RUN이다. Sprint 2 PASS는 선언하지 않는다.

**시각:** 2026-11-02 19:20:25 KST (`2026-11-02T10:20:25.231Z`)

**프로세스:** `bc-089fd7eb-dd2b-5690-b7ba-dd5ccc56854d`  
https://cursor.com/agents/bc-089fd7eb-dd2b-5690-b7ba-dd5ccc56854d

**환경:** Personal `316b619d-a743-11f1-a7d1-d6b4613131ce`. `environmentJsonPath`는 null이다. 저장소의 `.cursor/environment.json`은 없다. 빌드 `bld-20261028-3b73f7f9-9804-4207-bbd3-51f7e71bbb85`.

## 비밀 이름

`GPT_API_KEY`는 trim 이후 비어 있지 않아 PRESENT다. 상담 키는 `readGptApiKey()`만 읽었다. `OPENAI_API_KEY`와 `GOOGLE_AI_API_KEY`는 MISSING이고 사용하지 않았다.

주입된 이름: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `GPT_API_KEY`.

계정 비밀 이름 목록도 같다. `/proc` environ에서 `GPT_API_KEY` 이름은 PRESENT, `OPENAI_API_KEY` 이름은 MISSING이다.

부모 프로세스 `bc-e981acef-6442-4642-bef1-b0217b624b88`의 주입 이름은 `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`뿐이었다. 빌드는 `bld-20261025-b4665ae0-27b8-476e-aabf-2ee96bce1cd9`였다. 이 프로세스는 그 목록과 그 빌드와 같지 않다. 환경 공개 id와 `environmentJsonPath` null은 같다. 이 프로세스 주입과 계정 비밀 저장은 별개다.

## 호출

호출 1회. 재시도 0회. 요청은 프로세스를 떠났다. 두 번째 호출은 없었다.

제품 경로는 `runStageReanalysis`다. 부모는 성공한 2차 `5f6d705d-fe2a-468f-97be-da16482abd32`다. `forceNew`는 넘기지 않았다. 사용자 `e2e-live-user`, 프로젝트 `e2e-live-brewery`. 로컬 sqlite는 `productionDatabase` false, `durable` false였고 호출 뒤 삭제했다.

요청 모델은 제품이 정한 `gpt-4o-mini`다. temperature 0.2, maxTokens 2400. 모델을 바꾸지 않았다.

OpenAI는 completion 전에 HTTP 400을 반환했다. 응답 id는 null이다. 응답 모델은 null이다. usage는 null이다. 원문 content는 null이다.

저장 오류:

`OpenAI API error (400) provider_http=400 type=invalid_request_error message=Invalid schema for response_format 'stage_reanalysis': In context=('properties', 'nextQuestions', 'items'), 'required' is required to be supplied and to be an array including every request_id=req_5aed082a7254480388018108f03395f1 x-ratelimit-limit-requests=5000 x-ratelimit-limit-tokens=2000000 x-ratelimit-remaining-requests=4999 x-ratelimit-remaining-tokens=1989705 x-ratelimit-reset-requests=12ms x-ratelimit-reset-tokens=308ms`

단계 파서는 실행되지 않았다. 파서 이슈 목록은 비어 있다. `stage_judgment_copied`는 이번 실패 이유가 아니다. `stage_questions_repeated`와 `stage_objective_overlap`도 이번 저장 오류에 없다.

## 저장

새 행 `e229ba92-1ded-4a18-841d-6de86ac869c3`. wrote true. status failed. sections null. version 3. evidence `live_network`. 부모 `5f6d705d-fe2a-468f-97be-da16482abd32`.

실패했던 3차 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`은 로컬 저장소에 넣지 않았다. 이 행의 id도 아니다.

2차 시드의 `judgeStageContract`는 sections가 있어 복원하지 않았다. `parentRestoreIgnoredIssues`는 빈 배열이다. 1차 sections도 파서가 받았다.

이전 증거 `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json`의 sha256은 호출 전후 모두 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다.

## 전달 확인

사용자 JSON에 최초 양조장 아이디어 `originalInput`이 있다. `doNotCopy`, `firstAnalysis`, `priorReadings` 2건이 있다.

질문 키와 정보 수준:

| questionKey | answerLevel | resolution | verified | provenance |
|---|---|---|---|---|
| `48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1` | unresolved_gap | still_open | false | FOUNDER_INPUT |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q1` | menu_choice | method_selected | false | FOUNDER_INPUT |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q2` | menu_choice | method_selected | false | FOUNDER_INPUT |

`menu_choice`는 방법 선택이다. `planned_action`과 `reported_result`는 이번 답에 없다. verified는 모두 false다. 미연결 `5cf0e33d-f772-4e64-8b00-b633251aced5`는 SIMULATION / FOUNDER_CLAIM이다.

모델 본문이 없어 새 질문이 이미 답한 질문을 반복하는지는 관찰하지 못했다. 같은 판단 문장만으로 실패했는지 비교할 응답도 없다.

## 잠금

Production, Supabase, Founder UUID, 화면은 호출하지 않았다. 제품 코드는 바꾸지 않았다. 4차는 NOT RUN이다.
