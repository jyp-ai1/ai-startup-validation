# PR #197 CPO 2차 검증 패키지 — CTO 1차 제출

**상태 구분 (섞지 말 것)**

| 상태 | 이 패키지 |
|---|---|
| 구현 | **IMPLEMENTED** — 제품 코드 변경 있음. 커밋 SHA는 이 문서와 같은 커밋 |
| CTO 1차 검증 | 아래 표의 **PASS / FAIL / NOT VERIFIED** 만. 빌드 성공 ≠ 대화 검증 |
| CPO 2차 검증 | **미착수** — CPO가 이 자료를 독립 검토하기 전 |
| 병합 · Production | **하지 않음** · Production `0b465226` 불변 |

**기준:** 시나리오 본문 동결 `5263e83e` · 일괄안 `83596930` · 이전 구현 `cf9f39aa`  
**실행 경로:** `applyBusinessChoiceThroughLoop`  
**원시 I/O:** `docs/evidence/ALABOM/AI-PM/PR197-CPO-SECOND-VERIFY-DUMP.json`  
**재현:** `pnpm --filter web exec vitest run features/workflow-journey/lib/business-understanding/__tests__/pr197-cpo-second-verify-dump.test.ts`  
**로그인 UI 8턴:** **NOT VERIFIED** — 엔진 PASS를 UI PASS로 쓰지 않는다.

계획된 기대 · 테스트 코드 작성 · 테스트 실제 실행은 서로 다른 상태다. 이 문서의 입력/출력은 덤프 JSON에서 온 **실행 결과**다.

---

## A. 변경 식별 · 구현 요약

**PR:** [#197](https://github.com/jyp-ai1/ai-startup-validation/pull/197)  
**해결하려는 대화 문제:** 답해도 이해·판단·다음 질문이 나아지지 않음 (닫힌 슬롯 재질문, 결제 증거가 판단에 안 붙음, 선택지 절단/문제 재사용, 대화 조기 종료).

| 영역 | 파일 | 함수 · 달라진 점 |
|---|---|---|
| 다음 질문 | `decide-next-question-from-review.ts` | CLOSED 고객/문제면 문서 한 줄 skip. CONTRADICTED 우선. Stage B는 대안·검증을 채널보다 먼저 |
| FIX-10 | `ai-pm-judgment-next-question-binding.ts` | CLOSED면 덮지 않음. CONTRADICTED 고객은 재확인. bootstrap에 gapState 전달 |
| 조기 종료 | `ai-pm-no-gap-termination.ts` | 기록 안 된 Stage B 공백을 “공백 없음”으로 보지 않음 |
| 반복 방지 | `ai-pm-anti-repeat-policy.ts` | CLOSED 문제로 점프하지 않음 (gapState 전달) |
| 판단 | `ai-pm-judgment-aggregation.ts` | 결제 3건=약증거, 없음=미확정, 지인 1회=약증거. Fact/GO 아님 (`cf9f39aa`부터) |
| 선택지 | `build-business-choice-question.ts` | 문제/고객 문장 미절단. 구매자는 역할 옵션. 채널 fallback |
| 질문 문구 | `gap-question-map.ts` · `reframe-question.ts` · `ai-pm-question-human-language.ts` | 구매자=도입 결정자. 고객 문장 래핑 제거 |
| 모순 | `build-answer-review.ts` | 슬롯 밖 고객 정정 → CONTRADICTED (`cf9f39aa`부터) |
| 기타 | `apply-business-choice-through-loop.ts` | 빈 기타만 대기 (`cf9f39aa`부터) |

**영향·회귀 위험:** recovery2 P0-1/P0-2(첫 질문은 여전히 사업 한 줄). V3-03/V3-12는 baseline `47f62572`에서도 실패 — 이번 변경과 무관. 로그인 UI 미실행.

---

## B. 6개 사업 — 대표 대화 실행 (엔진)

덤프 `scriptedSixBusinesses` + `engineFollowEightTurns`. 동결 시나리오 8턴 문구 일치는 **부분**. 엔진이 실제로 이어지는지가 검증 대상.

### S1 배송 SaaS · B2B

| 테스트 ID | 이미 확인 | 실제 입력 | 실제 AI 다음 | 기대 | 이해·판단 변화 | CTO |
|---|---|---|---|---|---|---|
| S1-T1 | 없음 | 문제=`주문과 배송을 따로 관리해야 함` | 고객 질문 | 고객 좁히기 | problem `needs_check`, gap CLOSED | PASS |
| S1-T2 | 문제 CLOSED | 고객=`반찬가게` | **구매자/도입 결정자**. 「맞나요?」 없음 | R1 | customer `clear`. payer 미CLOSED. 결제 Fact 아님 | PASS |
| S1-T3 | 고객+문제 | `아직 모르겠음` | 대안으로 이동. payer OPEN | Fact 미승격 | intent=`unknown_signal`. Memory buyer 없음 | PASS |
| S1-T6 | 위 + 수익/대안 | `아직 실제 결제·사용 증거는 없습니다` | solution. 문제 confirm **아님** | HOLD, 미확정 | customerChange `needs_check` / 미확정 / hypothesis | PASS |
| S1-follow | 엔진 첫 선택 | 8턴: 문제→고객→payer→대안→검증→solution→검증→수익 | 닫힌 고객/문제로 비복귀. GO 없음 | 대화 지속 | 결론 HOLD | PASS (엔진) |

### S2 전통주 · 브랜드+유통

| 테스트 ID | 입력 | 실제 출력 | 기대 | CTO |
|---|---|---|---|---|
| S2-T1 | 문제=채널 흩어져 발견 어려움 | 고객 질문. 라벨 절단 없음 | 발견 문제 유지 | PASS |
| S2-T2 | 고객=`전통주를 선물·취미로 찾는 30–40대` | next=`payer` (한 줄 아님) | 선물 결제자 | PASS |
| S2-alt | 대안 슬롯 | `아는 술만 마트` / `지인 추천` / `아는 양조장`. 문제 문장 재사용 없음 | R4 | PASS |
| S2-follow | 8턴 | 문제→고객→payer→한 줄→대안→검증… GO 없음 | 대화 지속 | PASS (엔진) |

### S3 견적 자동화 · B2B

| 테스트 ID | 입력 | 실제 출력 | 기대 | CTO |
|---|---|---|---|---|
| S3-T1 | 문제=`메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다` | 「메일」 절단 없음 | 전사 오타 | PASS |
| S3-T2 | 고객=영업관리자 | next=`payer` (사용자≠구매자) | 결재자 | PASS |
| S3-T3 | 구매자=`사장님 본인` | 영업관리자를 결제자로 복사하지 않음 | 사용자≠구매자 | PASS |
| S3-T4 | 빈도=`아직 모르겠음` | 규모 Fact/GO 아님 | 빈도 미확인 | PASS |
| S3-follow | 8턴 | payer 이후 대안·검증으로 진행 | 지속 | PASS (엔진) |

### S4 구독 박스 · B2C

| 테스트 ID | 입력 | 실제 출력 | 기대 | CTO |
|---|---|---|---|---|
| S4-T2 | 고객=맞벌이 부모 | next=`payer` | 아이≠결제자 | PASS |
| S4-T6 | 결제 슬롯에 「아이가 아니라 20대」 | customerPersona=`CONTRADICTED`. next=`어느 쪽이 지금 맞는 고객인가요?` GO 아님 | D 모순 | PASS |
| S4-T7 재확인 후 superseded | — | 엔진에 20대 선택 턴은 **이번 덤프에 없음** | T7 Claim=20대 | **NOT VERIFIED** |
| S4-follow | 8턴 | 지속, GO 없음 | | PASS (엔진) |

### S5 쿠키 D2C

| 테스트 ID | 입력 | 실제 출력 | 기대 | CTO |
|---|---|---|---|---|
| S5-T2 | 고객=운동하는 20–30대 | customer `needs_check`. next=`payer` | 고객 판단 갱신 | PASS |
| S5-T3 | 기타+`헬스 트레이너가 회원에게 추천하고 회원이 결제` | 턴 저장 | 자유 입력 반영 | PASS |
| S5-friend | `지인에게 판 것 1회` | customerChange `needs_check` · 지인 1회 · evidenceType=hypothesis · applied=false · GO 아님 | Validated 아님 | PASS |
| S5-follow | 8턴 | 지속 | | PASS (엔진) |

### S6 가사 중개 · 양면

| 테스트 ID | 입력 | 실제 출력 | 기대 | CTO |
|---|---|---|---|---|
| S6-T2 | 고객=맞벌이 가정 | next=`payer` | 양면을 한 고객으로 합쳐 재질문하지 않음 | PASS |
| S6-supply+pay | 공급 0 + 수수료 낸 적 없음 | GO/네트워크 효과 없음. 미확정 hypothesis | 성급한 GO 금지 | PASS |
| S6-follow | 엔진 첫 선택 3턴 후 정지 (problem→customer→payer) | 8턴 지속 | Stage B 미도달 | **FAIL** (팔로우) |

---

## C. R1–R4 수정 전후 (실행)

이전 실행은 `47f62572` 품질 패키지 / `PR197-R1-R4-ENGINE-PROBE.json`. 이번은 덤프 JSON.

| ID | 수정 전 (실행) | 수정 후 (이번 실행) | 기대 | CTO |
|---|---|---|---|---|
| R1 | next=`핵심 불편은 「주문」으로 이해했습니다. 맞나요?` | next=`payer` · `이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?` | 구매자. 문제 confirm 금지 | **PASS** |
| R2 | 결제 있음/없음 동일 결론·customerChange | 있음=`약증거` / 없음=`미확정`. 둘 다 clear/fact/GO 아님. applied=false | 판단이 갈림. 둘 다 HOLD | **PASS** |
| R3 | why=`누구를 위한 사업인지` 고정 | 고객 확인 후 해당 고정 문구 없음. 다음=구매자 | 사업×미해결 가설 | **PASS** (고객 직후) |
| R4 | 대안=문제 문장 재사용 | `아는 술만 마트` / `지인 추천` / `아는 양조장` | 발견 우회 | **PASS** |

---

## D. 답 → 이해 · 판단 · 다음 질문

성과 기준: 질문이 바뀌어도 판단이 그대로면 실패.

| 답 | 이해 | 판단 | 다음 질문 | 선택 이유 (실행) |
|---|---|---|---|---|
| S1 고객=반찬가게 | 고객 Fact. 구매자 아님 | customer unknown→clear. 결제 미확정 | 구매자/도입 결정자 | CLOSED 고객/문제 → payer. FIX-10이 문제 confirm으로 덮지 않음 |
| S1 모름 (payer) | payer 미CLOSED. Memory buyer 없음 | 결론 유지. GO 아님 | 대안 | unknown_signal |
| S1 결제 없음 vs 3건 | 둘 다 Memory 미병합 | 미확정 vs 약증거. 둘 다 hypothesis | 다름 | classifyValidationEvidence |
| S2 고객=선물 30–40대 | 라벨 미절단 | customer needs_check | payer | 한 줄 skip |
| S4 20대 정정 | customerPersona CONTRADICTED | GO 아님. 이전 고객을 그대로 Fact로 닫아 두지 않음 | 맞는 고객 재확인 | 슬롯 밖 정정 |
| S5 지인 1회 | 검증 슬롯 OPEN | 반복 수요 아님 | (한 줄이 남을 수 있음) | 약증거 캡 |

---

## E. 모름 · 자유 입력 · 모순

| ID | 입력 | 실제 | 기대 | CTO |
|---|---|---|---|---|
| E-unknown | S1 payer `아직 모르겠음` | intent=`unknown_signal`. payer OPEN. Fact 없음 | 미확인 유지 | PASS |
| E-other-empty | 기타 + 빈 텍스트 | waitingForFreeText. 미저장 | 대기 | PASS |
| E-other-fill | 기타+`본사·가맹본부가 결제합니다` | 턴 저장 | 반영 | PASS |
| E-s5-freetext | 기타+트레이너/회원 결제 | 턴 저장 | 반영 | PASS |
| E-s4 | 결제 슬롯에 고객 뒤집기 | CONTRADICTED + 재확인 질문 | 이전 Fact 재평가 | PASS |
| E-s4-T7 | 20대 선택 후 superseded | 미실행 | T7 상태표 | **NOT VERIFIED** |

---

## F. Fact / Claim / Inference / Assumption / Validated

실행 정의: Memory current = Fact. review.evidenceClass = FACT/INFERENCE/ASSUMPTION/UNKNOWN/CONTRADICTION. judgment.evidenceType=fact 이면 Validated 오승격.

| 경로 | Memory Fact | Review | Judgment evidenceType | Validated? | CTO |
|---|---|---|---|---|---|
| S1 문제·고객 선택 | problem/customer current | problem/customer FACT | — | 아니오 | PASS |
| S1 payer 모름 | buyer 없음 | extractedFacts 빈 배열 | — | 아니오 | PASS |
| 결제 3건 | 미병합 (applied=false) | — | hypothesis · 약증거 | **아니오** | PASS |
| 결제 없음 | 미병합 | — | hypothesis · 미확정 | 아니오 | PASS |
| 지인 1회 | 미병합 | extractedFacts 빈 배열 | hypothesis · 지인 1회 | **아니오** | PASS |
| 문서 한 줄 | living known / DOCUMENT | — | — | 문서 ≠ Fact | PASS (구분 존재) |

---

## G. 성급한 GO · 증거 오승격

| 가드 | 실행 | CTO |
|---|---|---|
| 고객 선택 ≠ 구매자/결제 Fact | S1-T2 payer 미CLOSED | PASS |
| 결제 있음 → Fact/GO 금지 | 약증거, applied=false, 결론에 GO 없음 | PASS |
| 결제 없음 → 의향 미확정 | 미확정 | PASS |
| 지인 1회 ≠ 수요 검증 | 위 F | PASS |
| 공급 0+결제 0 ≠ 플랫폼 GO | S6 결론에 GO/네트워크 효과 없음 | PASS |
| 모순 후 GO 금지 | S4 | PASS |
| 6사업 follow 결론 GO | 없음 | PASS |
| 로그인 UI에서 GO 문구 | 미실행 | **NOT VERIFIED** |

---

## H. 전체 테스트 결과 · 잔여 위험

**실행한 테스트 (코드 작성 ≠ 실행이 아님. 아래는 실행함)**

| 층 | 파일 | 결과 |
|---|---|---|
| 대화 품질 | `pr197-conversation-quality.test.ts` | 실행함 · 통과 (이번 작업 기준 22) |
| CPO 덤프 | `pr197-cpo-second-verify-dump.test.ts` | 실행함 · I/O JSON 기록 |
| MCQ 루프/저니 | `ai-pm-mcq-real-loop` · `ai-pm-mcq-journey` | 실행함 · 통과 |
| recovery2 | P0-1 / P0-2 question loop | 실행함 · 통과 |
| 로그인 UI E2E | — | **실행하지 않음** |
| 동결 시나리오 8턴 문구 일치 | — | 엔진 팔로우는 8턴(S1–S5). **문구 일대일 일치는 아님** |
| S4 T7 superseded | — | **실행하지 않음** |
| S6 엔진 팔로우 8턴 | 덤프 | **FAIL** — payer 이후 정지 (3턴) |
| v3-runtime-certification V3-03/12 | 기존 | baseline과 동일 실패. 이번 변경과 무관 |

**CTO 1차 총평 (CPO 승인 아님)**

| CPO 확인 항목 | CTO 1차 |
|---|---|
| 이미 답한 문제를 다시 묻지 않는가 | PASS (R1, 결제 후 장경로). S6 팔로우 조기 정지는 재질문이 아니라 중단 |
| 고객 선택 ≠ 구매자·결제 사실 | PASS |
| 결제 증거 유무에 따라 판단이 달라지는가 | PASS |
| 다음 질문이 사업 유형·미해결 가설에 맞는가 | PASS (고객 직후 payer). S2–S5는 payer 닫힌 뒤 문서 한 줄이 다시 나올 수 있음 |
| 모름·자유 입력·모순이 반영되는가 | PASS. S4 T7은 NOT VERIFIED |
| 불충분 증거로 GO/검증 완료를 선언하지 않는가 | PASS (엔진) |
| 6개 사업에서 대화가 이어지는가 | S1–S5 엔진 팔로우 PASS. **S6 FAIL** |

**잔여 위험**

1. S6 엔진 팔로우가 payer 이후 멈춤 — 양면 가설(공급/신뢰)로 못 감.  
2. S2–S5는 Stage A가 닫히면 `businessOneLiner` confirm이 다시 끼어들 수 있음.  
3. 문제 판단 요약이 `PRIMARY: 주문`처럼 잘릴 수 있음 (다음 질문 회귀는 막음).  
4. 구매자 답 문장 래핑이 일부 경로에 남을 수 있음 (`낸다`는 수정함).  
5. 로그인 UI · 동결 8턴 문구 · S4 T7은 NOT VERIFIED.  
6. V3-03/12는 기존 실패. 기대를 낮추지 않음.

---

## I. CPO 재현 절차

1. 브랜치 `cursor/ai-pm-mcq-understanding-e648`, 이 패키지와 같은 커밋.  
2. `pnpm --filter web exec vitest run features/workflow-journey/lib/business-understanding/__tests__/pr197-cpo-second-verify-dump.test.ts`  
3. `docs/evidence/ALABOM/AI-PM/PR197-CPO-SECOND-VERIFY-DUMP.json` 을 연다.  
4. 각 시나리오 `turns[]`에서 `actualUserInput` / `judgmentBefore` / `judgmentAfter` / `nextQuestionText` / `gapStateAfter` / `knowledge` 를 본다.  
5. `engineFollowEightTurns.S1`–`S6`으로 대화 지속을 본다. S6는 3턴에서 끊긴다.  
6. 로그인 UI는 이 절차에 없다. UI를 열지 않고 엔진 PASS를 승인하지 말 것.

플래그: 덤프는 `setV3ReviewPipelineForTest(true)` + `setAiPmJudgmentAggregationV1ForTest(true)`.

---

## CPO 판정 칸 (비움)

CPO만 채운다. CTO가 승인하지 않는다.

- 판정: APPROVE / NEEDS FIX / HOLD  
- 검증한 범위:  
- 미검증 범위:  
- 핵심 근거:  
- 다음 작업:  

CTO는 병합하지 않는다. 미검증 항목은 완료가 아니다.
