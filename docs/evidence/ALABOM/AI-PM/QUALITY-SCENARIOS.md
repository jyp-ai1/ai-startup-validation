# 양조장 AI 질의 품질 시나리오

코드 커밋 `6b9994a4341dcaca732bded614f9180c0b1e4251`. 이 문서는 그 다음 커밋이다. 둘 다 Preview 런타임 SHA가 아니다.

1차 게이트는 FAIL이다. Production `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`는 잠금이다. PR #209는 병합하지 않는다. 제품의 `POST /api/ai-pm-review/follow-up`은 이 테스트에서 호출하지 않았다.

## 계약

최초 분석 프롬프트 버전은 `quality-2`다. 요청은 `buildFirstReviewRequest`다. 출력 키는 summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices 이다.

금지:

- 원문에 없는 가격, 인원, 매출, 시장 규모, 수수료, 참가비, 제휴 확정을 사실로 쓰기
- 높다, 낮다, 미정만으로 된 선택지
- 창업자가 아직 하지 않은 답을 첫 응답에서 사실로 만들기

시나리오 턴 프롬프트 버전은 `scenario-sim-1`이다. 요청은 `buildScenarioSimulationRequest`다. 시스템 문장은 `이 요청은 품질 시뮬레이션이다. 제품의 후속 검토 경로가 아니다.`로 시작한다. 제품 follow-up 요청에는 이 문장이 없다.

시나리오 출력 키는 founderClaim, changed, unchanged, priority, cheapExperiment, nextQuestion, choices 이다. 창업자 답은 가설이다. 이전 질문을 반복하지 않는다.

## 양조장 본문

다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 개인별 다양한 경험을 중요시하는 관광객 중 전통주와 양조장을 좋아하는 내국인·외국인을 대상으로 양조장 체험을 안내하고, 주변을 즐길 수 있는 사업을 구상 중이다. 이 사업은 양조장의 다양한 온라인 마케팅에서 시행될 수 있어서 이를 지원하려 한다. 위 내용으로 사업성 검토와 추가 질의가 필요한 부분을 안내해 달라.

## 시나리오

| ID | 창업자 답 | 평가가 찾는 변화 |
|---|---|---|
| A | 아직 협력 양조장이 없다. | 공급 확보 또는 파일럿 |
| B | 양조장 3곳이 참여 의사를 밝혔다. | 운영, 체험 상품, 예약. 의사는 가설 |
| C | 관심은 있을 것 같지만 유료 고객은 없다. | 관심과 유료 지불을 나누고 실험 제안 |
| D | 외국인 개별 관광객을 우선 공략한다. | 언어, 예약, 이동, 이해 |
| E | 수수료, 체험비, 마케팅비 중 미정 | 지불 주체를 가설로 비교 |
| F | 시장이 클 것 같다. | 근거를 사실로 두지 않고 확인할 증거 |
| G | 양조장이 비용 지불을 원하지 않는다. | 수익 가설과 대안 |
| H | 관광객은 원할 것 같지만 양조장 참여는 불확실하다. | 양쪽을 나누고 검증 순서 |

사람이 적은 문장이 이 규칙을 통과해도 모델 통과가 아니다.

## 프롬프트 변경

`quality-2` 이전에 첫 프롬프트에는 버전 문자열이 없었다. `6b9994a4`에서 버전을 붙이고, 아직 고르지 않은 창업자 답을 사실로 만들지 말며, 첫 질문은 정도가 아니라 갈림길을 가르라고 덧붙였다. 저장 계약 `comprehensive-1`과 제품 follow-up 상한 800토큰은 바꾸지 않았다. 시뮬레이션 상한은 1400토큰이고 제품 경로가 아니다.

## 실행

| 항목 | 판정 |
|---|---|
| 루브릭 단위 테스트 4건 | 실행함. 사람이 적은 예시의 채점이다. 모델 품질 통과가 아니다 |
| 실제 `gpt-4o-mini` 최초 응답 | **NOT RUN** — 이 실행에 `GPT_API_KEY` 없음 |
| 시나리오 8개의 실제 모델 턴 | **NOT RUN** — 같은 이유. 라이브 테스트는 건너뜀 |
| 제품 follow-up 호출 | 하지 않음 |
| 수정 전후 실제 응답 비교 | **NOT RUN** |
| 회귀를 실제 모델로 재실행 | **NOT RUN** |

라이브 실행은 `pnpm --filter web test:ai-pm-quality-live`다. 키가 있을 때만 `quality-scenario-live.json`을 남긴다. 그 파일은 아직 없다.

이전에 화면에 남았던 질문은 `양조장과의 협력 가능성은 어떻게 되는가?`이고 선택지는 높다, 낮다, 미정이다. 그 형태는 루브릭에서 `polarity_choices`로 실패한다. 이것은 저장된 응답을 다시 채점한 것이고, `quality-2`의 새 모델 응답이 아니다.
