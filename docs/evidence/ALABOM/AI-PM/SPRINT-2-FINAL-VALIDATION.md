# Sprint 2 최종 실증

2026-11-01 21:34 KST. PR #226.

1차부터 4차까지의 GPT 실호출은 NOT RUN이다. 이 프로세스는 Preview가 아니고 `GPT_API_KEY`가 없다. Production에는 접속하지 않았다. 프롬프트, 제품 경로, 실험 B 하니스, 화면, DB 스키마, Founder 프로젝트는 바꾸지 않았다. 실패 라운드 재호출은 없다. 호출이 없으므로 재호출할 라운드도 없다. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않는다.

## 1. 실행 환경과 기준 커밋

| 확인 | 결과 |
| --- | --- |
| HEAD | `a74b5fc3f5021b98847e8acdd262d6543c8d54f8` |
| 판단 계약 설계 | `fee6ddc3` |
| 구현 범위 | `3c4adc66` |
| 단위 검증 구현 | `a74b5fc3` |
| `ai-pm-decision-contract.ts` | 존재 |
| `ai-pm-decision-contract-run.ts` | 존재 |
| `GPT_API_KEY` | 없음 |
| `OPENAI_API_KEY` | 없음. 이 키로 대체하지 않음 |
| `VERCEL_ENV` | 없음. Preview로 식별되지 않음 |
| `VERCEL_TOKEN` | 없음 |
| Vercel CLI | 없음 |
| Production | 호출하지 않음 |

승인된 모듈의 모델 상수는 `gpt-4o`다. 그 모델을 보낸 요청은 없다.

## 2. 단위 테스트

2026-11-01 21:34 KST에 재실행했다.

`pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-decision-contract.test.ts`

9건 통과. 실패 0건. 소요 50ms. 네트워크 호출 0회.

이 재실행은 실호출이 아니다. 답 누락 0회 호출, 구간 불일치와 수요 긍정 변환의 선택 차단, SIMULATION `confirmedFacts` 빈 배열, 수요 불확실 유지, 사업성 유보는 단위 장부에서 확인된 상태다. 실 GPT 응답에 대한 판정은 아니다.

## 3. 1~4차 실호출

| 차수 | 상태 | 요청 | 응답 | 호출 시각 | 토큰 | 비용 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | NOT RUN | 없음 | 없음 | 없음 | 없음 | 없음 |
| 2 | NOT RUN | 없음 | 없음 | 없음 | 없음 | 없음 |
| 3 | NOT RUN | 없음 | 없음 | 없음 | 없음 | 없음 |
| 4 | NOT RUN | 없음 | 없음 | 없음 | 없음 | 없음 |

총 호출 0. 실패 호출 0. 성공으로 재사용한 실패 결과 없음.

원본 자리 표시는 `docs/evidence/ALABOM/AI-PM/sprint-2-final-validation.json`이다. `status`는 `NOT RUN`이고, 라운드별 `request`와 `response`는 null이다.

## 4. 확보만 하고 보내지 않은 입력

실험 A·B와 같은 사업 본문은 `COMPARE_BUSINESS_BODY`다. 실험 B의 SIMULATION 순서는 다음 세 문장이다. 이번 체인에 넣지 않았다.

1. `SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.`
2. `SIMULATION. 실제 예약과 지불은 없다. 누가 비용을 낼지는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.`
3. `SIMULATION. 알릴 채널과 운영 책임자는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.`

SIMULATION을 Founder의 확인된 사실로 쓰지 않았다. 다른 모델, 다른 하니스, 다른 입력으로 바꾸지 않았다.

## 5. 판단 계약 네 단계

실응답이 없으므로 네 단계 모두 NOT RUN이다.

| 단계 | 실호출 판정 | 이유 |
| --- | --- | --- |
| Answer Grounding | NOT RUN | 전송된 `currentAnswer` 없음. 변화 구간 없음 |
| Unknown Preservation | NOT RUN | 미확인 목록을 받은 응답 없음. `confirmedFacts` 실측 없음 |
| Judgment Delta | NOT RUN | 유지·변경·추가·유보를 적은 응답 없음 |
| Priority Selection | NOT TESTED | 선택 호출 없음 |

단위 테스트가 본 요청 조립은 `currentAnswer` 키에 답 전문을 넣는다. 그 사실은 실 GPT 요청의 증거가 아니다.

## 6. 라운드 판정

| 차수 | 판정 |
| --- | --- |
| 1 | NOT RUN |
| 2 | NOT RUN |
| 3 | NOT RUN |
| 4 | NOT RUN |

PASS도 FAIL도 아니다. 실행되지 않은 라운드를 통과로 두지 않는다.

## 7. 반복 질문과 판단 발전

NOT RUN. 비교할 질문과 판단 문장이 없다.

## 8. 전체 사업성 평가

| 평가 영역 | 판정 |
| --- | --- |
| 사업 맥락 연속성 | NOT RUN |
| 답변 이해 | NOT RUN |
| 사실 구분 | NOT RUN |
| 판단 발전 | NOT RUN |
| 미확인 관리 | NOT RUN |
| 질문 발전 | NOT RUN |
| 우선순위 | NOT TESTED |
| 전체 사업성 | NOT RUN |

질문이 바뀌었는지는 확인할 응답이 없다.

## 9. 비용과 토큰

입력 토큰 0. 출력 토큰 0. 저장소 요금 0. OpenAI response ID 없음. 청구서 없음.

## 10. 미해결

Preview로 식별된 환경이 없고 `GPT_API_KEY`가 없다. 그 상태에서 체인을 보내지 않았다. 1~4차 연속 호출, 네 관문의 실응답 판정, 우선순위 품질, 질문 반복 여부, 사업성 판단의 연속성은 남아 있다.

## 11. Sprint 2 최종 권고

Sprint 2는 PASS 후보가 아니다. PARTIAL을 유지한다.

PASS 후보 조건 가운데 1~4차 연속 실호출, 네 단계의 실응답 통과, 답변에 없는 사실의 실측 부재, 미확인 보존의 실측, 판단의 실질적 발전, 우선순위 타당성, 질문 반복 방지, 사업성 연속성, 저장 결과와 호출 이력의 일치는 모두 NOT RUN이다. 단위 테스트 9건 통과는 그 조건을 대신하지 않는다.

| 항목 | 상태 |
| --- | --- |
| Sprint 1 | PASS |
| Sprint 2 | PARTIAL |
| 판단 계약 설계 | 승인 |
| 구현 범위 | 승인 |
| 독립 모듈 구현 | `a74b5fc3` |
| 단위 테스트 | 9건 통과, 2026-11-01 21:34 KST 재실행 |
| GPT 실호출 | NOT RUN |
| Priority Selection 품질 | NOT TESTED |
| Sprint 3~6 | 대기 |
| Production | LOCKED |
