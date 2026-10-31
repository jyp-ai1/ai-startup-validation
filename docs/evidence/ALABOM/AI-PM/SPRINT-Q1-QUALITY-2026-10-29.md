# Sprint AI-PM-Q1-QUALITY 증거

상태: **BLOCKED**. 제품 기본 프롬프트는 `quality-2`다. `quality-5-cpo-draft`는 후보 요청으로만 있다. 모델 응답 원문은 없다. 1차 완료가 아니다.

## 1. 기준선

작업 전 HEAD는 `f4df9692e59fe6d9a1ab0d510849bb3ae3686669`다. 브랜치는 `cursor/preview-quality-compare-4b88`다. `origin/main`과 Production 잠금은 `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`다. PR #210은 OPEN이고 base는 `cursor/ai-pm-single-flow-4b88`이다. https://github.com/jyp-ai1/ai-startup-validation/pull/210

제품 1차 요청은 `buildFirstReviewRequest()`다. 시스템 문장은 `firstReviewSystemPrompt()`, 버전 상수 `AI_PM_FIRST_PROMPT_VERSION = quality-2`다. 사용자 문장은 사업 입력 앞에 `사업 입력:`을 붙이고, 키 목록에는 `alternatives`, `differentiation`이 없다. 시스템 키 목록에는 있다. 모델 `gpt-4o-mini`, temperature `0.2`, max tokens `2400`, `response_format` `json_object`. 입력은 24,000자를 넘으면 호출 전에 거절된다. 추정 3,000토큰 예산이 넘으면 사용자 문장만 잘린다. 양조장 종합 검토 입력은 그 예산 안에서 잘리지 않는다. 전문은 `PROMPT-FULL-TEXT-2026-10-29.md`와 같다. 이번 변경은 그 함수를 수정하지 않았다.

저장 경로는 `POST /api/ai-pm-review` → `runFirstReview` → `parseSections` → `insertReview`다. 선택 답은 피드백으로 저장되고 `nextDirectionAfterChoice`가 화면 문장을 만든다. 그 경로는 모델을 다시 부르지 않는다. `alternatives`와 `differentiation`은 `readBusinessAnalysis`가 읽고 화면에 표시한다. 잘못된 JSON이나 필수 키 누락은 `parseSections`가 null을 반환하고, 제품은 `unstructured_response`로 남긴다. 입력에 없는 수수료·참가비는 가설 표시가 없으면 저장 문장 앞에 가설이라고 붙는다. 입력에 없는 수치 표현은 `원문에 없는 수치`로 바뀐다.

이전 실패 증거: `3be5715e`는 `quality-2` 응답이 아니다. 질문 `양조장과의 협력 가능성은 어떻게 되는가?`, 선택지 높다/낮다/미정, 수익 문장 `양조장으로부터의 수수료 및 체험 참가비.`다.

## 2. 후보 `quality-5-cpo-draft`

이 문장은 이번 작업지시 3.1~3.4를 후보 프롬프트로 구현한 것이다. 작업지시 안에 별도의 완문 초안이 없어, 그 기준을 이 문장으로 보존했다. 제품 경로에 넣지 않았다. Preview 비교 픽스처에도 없다.

시스템 전문:

```
프롬프트 버전 quality-5-cpo-draft.
당신은 초기 창업자의 1차 사업성 검토를 돕는 전략 파트너다. 요약으로 끝내지 않는다.
[보존]
1. summary는 입력에 있는 사업 축을 빠뜨리지 않는다. 이용자가 경험하는 활동과 공급자에 대한 지원이 함께 있으면 둘 다 적는다.
2. 입력에 없는 상품 판매, 계약, 제휴, 지역, 가격을 이미 결정된 사실로 추가하지 않는다.
[사실]
3. founderFacts에는 입력 문장으로 확인되는 내용만 적는다.
4. inferences에는 추론이라고 표시한다.
5. assumptions는 사업 성립을 좌우하는 미검증 가정 1~3개다.
6. revenueModel에서 입력에 없는 수익원은 가설이라고 적고, 누가 왜 낼 수 있는지를 가정으로 구분한다. 시장 통계, 가격, 수수료, 매출, 계약을 근거 없이 만들지 않는다.
7. customer는 경험을 쓰는 이용자다. payer는 돈을 낼 수 있는 주체다. 입력에 지불자가 없으면 payer는 미확인이라고 적는다.
[질문]
8. nextQuestion은 하나다. 다음 의사결정을 바꾸는 미확인 가정 하나만 묻는다. 협력·수요·가능성이 높다, 낮다, 미정인지만 묻지 않는다.
9. 입력이 이용자 경험과 공급자 지원을 함께 말하면, choices는 그 사업의 말로 다음을 구분한다. 이용자 경험을 먼저 검증. 공급자 지원을 먼저 검증. 둘을 결합한 모델을 검증. 아직 우선순위를 결정하지 못함. 기타 / 직접 입력.
10. 그 구분은 두 축이 함께 있는 사업에만 쓴다. 두 축이 없는 사업에는 그 문장을 붙이지 않고, 그 사업의 고객, 지불자, 상품, 운영이 갈라지는 선택지를 만든다.
11. nextQuestionReason은 이 질문 하나를 먼저 묻는 이유다. nextVerification은 그 가정을 적은 비용으로 확인하는 행동이다.
12. nextQuestion은 choices가 구분하는 사업 방향 또는 검증 우선순위를 직접 묻는 질문이어야 한다. 질문과 선택지는 같은 의사결정에 대응해야 하며, 선택지에 없는 방향을 질문하거나 질문에 답해도 선택지 중 하나를 고를 수 없는 구조를 만들지 않는다. 각 선택지는 서로 구별되는 검증 방향이어야 하고, 입력에 없는 사실을 전제로 하지 않는다.
[출력]
13. JSON 객체만 반환한다. JSON 밖에 설명이나 마크다운을 쓰지 않는다.
14. 키는 다음만 사용하고 모두 포함한다. summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices.
15. summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, judgment, nextVerification, nextQuestion, nextQuestionReason은 문자열이다. 입력으로 채울 수 없으면 미확인이라고 적는다.
16. strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, choices는 문자열 배열이다. choices는 3~5개다.
17. 모델이나 공급사 이름은 쓰지 않는다.
```

양조장 종합 검토 입력이 들어간 사용자 전문:

```
사업 입력:
다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.

검토 목적: 종합 사업성 검토
현재 단계: 미확인
가장 알고 싶은 것: 없음
검토 계약: comprehensive-1

프롬프트 버전 quality-5-cpo-draft.
키: summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices.
시스템 지시의 키와 같다. 문자열 키는 문자열, 배열 키는 배열로 둔다. choices는 3~5개의 문자열이다.
검토 목적, 현재 단계, 가장 알고 싶은 것이 있으면 질문과 판단을 그 목적에 맞춘다. 원문에 없는 수익 항목은 가설로 적는다.
```

실행 설정은 제품과 같다. `gpt-4o-mini`, temperature `0.2`, max tokens `2400`, `json_object`. 이 후보의 시스템 문장을 제품 예산에 넣어도 위 사용자 문장은 잘리지 않는다. 차이는 시스템 문장, 사용자 키 목록, 제품 `fitReviewMessages`를 후보 빌더가 쓰지 않는다는 점이다. 이번 입력에서는 그 차이가 잘림으로 나타나지 않는다.

## 3. 실제 모델 응답

CPO가 `quality-2`와 규칙 12가 들어간 `quality-5-cpo-draft`의 각 1회 호출을 승인했다. 2026-10-29 16:28 KST에 `executeSprintQualityPair`를 실행했다. 상태는 **NOT RUN**이다. 이유: `GPT_API_KEY missing`. 이 프로세스에 그 키가 없고, 주입된 비밀 이름은 Supabase URL과 anon, service role뿐이다.

| 버전 | 요청 상태 | 모델 | temperature | max_tokens | 응답 원문 | 파싱 |
|---|---|---|---|---|---|---|
| `quality-2` | `not_run` | `gpt-4o-mini` | 0.2 | 2400 | 없음 | 하지 않음 |
| `quality-5-cpo-draft` | `not_run` | `gpt-4o-mini` | 0.2 | 2400 | 없음 | 하지 않음 |

시스템 문장과 사용자 문장은 `docs/evidence/ALABOM/AI-PM/sprint-q1-pair-not-run.json`에 있다. 완료 ID와 오류 원문은 없다. 호출이 네트워크에 나가지 않았다. 빈 원문을 모델 실패로 두지 않는다.

## 4. 품질 게이트

라이브 응답이 없어 Q1, Q2, Q5, Q6은 **NOT RUN**이다. 후보 FAIL이 아니다. Q3, Q4, Q7~Q10도 **NOT RUN**이다. 전체는 **BLOCKED**다.

| ID | 상태 | 증거 |
|---|---|---|
| Q1 | NOT RUN | 모델 summary 없음 |
| Q2 | NOT RUN | 모델 수익 문장 없음 |
| Q3 | NOT RUN | 모델 payer 없음 |
| Q4 | NOT RUN | 모델 시장 문장 없음 |
| Q5 | NOT RUN | 모델 질문 없음 |
| Q6 | NOT RUN | 모델 선택지 없음 |
| Q7 | NOT RUN | 모델 이유 없음 |
| Q8 | NOT RUN | 파서 단위 테스트는 스키마를 읽는다. 모델 원문의 저장·재조회는 없다 |
| Q9 | NOT RUN | 브라우저 새로고침·재인증 없음 |
| Q10 | NOT RUN | 선택 저장과 후속 호출 부재를 브라우저에서 보지 않음 |

단위 테스트는 두 가지를 확인한다. 손으로 만든 실패 문장은 Q2 FAIL이고 요약이 FAIL이다. 손으로 만든 스키마 예시는 파서가 `differentiation`을 읽고 Q1·Q6을 pass로 매기며, Q8은 저장을 하지 않아 not_run이다. 이 예시는 모델 응답이 아니다.

## 5. 브라우저

**NOT RUN.** SHA `f4df9692`의 Preview 배포 `dpl_G92A6Y1oGSNGfVjg4ymk6tEExALu`는 2026-10-29 16:08 KST에 failure다. 배포 로그는 읽지 못했다. `VERCEL_TOKEN`이 이 환경에 없다. 실패 단계는 미확인이다. 이 실패를 모델 호출 실패로 두지 않는다. 인증된 브라우저 세션은 열지 않았다.

## 6. 변경

- `apps/web/features/business-validation-journey/lib/ai-pm-quality-compare.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-quality-compare.test.ts`
- `docs/evidence/ALABOM/AI-PM/sprint-q1-pair-not-run.json`
- 이 문서

`ai-pm-review.ts`의 제품 프롬프트는 바꾸지 않았다. 2차 모델 호출은 없다. Production은 호출하지 않았다.

## 7. CPO 검토

규칙 12는 후보에 반영했다. 승인된 두 호출은 키 부재로 **NOT RUN**이다. `GPT_API_KEY`가 이 프로세스에 들어오면 같은 입력으로 각 1회만 다시 실행하고 원문을 저장한다. 그 전에는 하드 게이트를 채점하지 않는다. 제품 기본값은 `quality-2`다.
