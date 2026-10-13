# PR #197 CPO 2차 검증 — 인라인 증거 보고서

CPO가 저장소 링크를 열지 않고 이 본문만으로 실패·수정·재실행을 판정할 수 있게 작성한다.  
기존 자료(`PR197-CPO-SECOND-VERIFY-VERDICT.md` · `PACKAGE.md` · `DUMP.json`)를 재사용하되, 핵심 판정과 실제 대화 I/O를 여기에 직접 옮긴다.  
로그를 재작성하지 않는다. 기대 결과를 실제 출력처럼 쓰지 않는다.

| 항목 | 값 |
|---|---|
| PR | #197 |
| 브랜치 | `cursor/ai-pm-mcq-understanding-e648` |
| 기존 CPO 판정 | **NEEDS FIX** — S4 living/Memory Fact 잔류 · T7 미검증 |
| 이번 구현 | S4 고객 모순 상태 일관성 · SHA `8965af43` |
| 이전 엔진 수정 | FIX-S6 · FIX-ONELINER · FIX-S4-JUDGMENT · SHA `59339f93` (CPO 2차에서 개선 확인) |
| 재실행 덤프 `meta.implSha` | `8965af43` |
| 실행 경로 | `applyBusinessChoiceThroughLoop` |
| 시나리오 동결 | `5263e83e` |
| Production | `0b465226` 불변 |
| Merge | 하지 않음 |
| CPO 2차 | **미판정** — 이 보고서 수령 후 독립 검증 |
| 로그인 UI | **NOT VERIFIED** |

상태 어휘: NOT STARTED · IMPLEMENTED · CTO VERIFIED · CPO VERIFIED · NEEDS FIX · NOT VERIFIED  
계획 · 테스트 작성 · 테스트 실행을 섞지 않는다.

---

## A. 기존 CPO 판정 요약 (`f9911ed6`)

출처: `docs/evidence/ALABOM/AI-PM/PR197-CPO-SECOND-VERIFY-VERDICT.md`  
원시 I/O: `PR197-CPO-SECOND-VERIFY-DUMP.json` (당시 `meta.implSha` = `404da1cf`, 핀 `f83d15ed`)

### A1. 한 줄

대화 엔진은 R1(닫힌 문제 재질문)과 R2(결제 유무 판단 분기)는 고쳤다.  
그러나 S6는 3턴에서 멈추고, S4 고객 정정 후 판단 문구는 맞벌이 부모 Fact로 남으며, S2–S5는 구매자를 닫은 뒤 문서 한 줄을 다시 물었다.

### A2. CPO 7항 (기존)

| # | 기준 | 당시 실제 | 기존 CPO |
|---|---|---|---|
| 1 | 이미 답한 문제를 다시 묻지 않는가 | S1 고객 후 next=`payer`. 「핵심 불편은 「주문」 맞나요?」 없음 | **PASS** |
| 2 | 고객 선택 ≠ 구매자·결제 사실 | S1 반찬가게 후 payer 미CLOSED, Memory buyer 없음 | **PASS** |
| 3 | 결제 증거 유무에 따라 판단이 달라지는가 | 3건=`약증거` / 없음=`미확정`. 둘 다 hypothesis, GO 없음 | **PASS** |
| 4 | 다음 질문이 사업 유형·미해결 가설에 맞는가 | 고객 직후는 payer. 그다음 S2–S5는 문서 한 줄로 후퇴 | **NEEDS FIX** |
| 5 | 모름·자유 입력·모순이 상태와 판단에 반영되는가 | 모름=unknown_signal. 기타+본사 저장. gap=`CONTRADICTED`, next=재확인. **판단 요약은 맞벌이 부모** | **NEEDS FIX** |
| 6 | 불충분 증거로 GO/검증 완료를 선언하지 않는가 | 결제 3건·지인 1회·S6 공급0+결제0에 GO 없음 | **PASS** (엔진) |
| 7 | 6개 사업에서 대화가 이어지는가 | S1–S5 팔로우 8턴. **S6는 3턴 정지** | **FAIL** |

### A3. 실패 ID

| ID | 기대 | 당시 실제 | CPO가 문제로 본 이유 |
|---|---|---|---|
| **FIX-S6** | S6 팔로우가 payer 이후에도 이어지고, `askedGaps` 길이 ≥ 5, 공급 또는 대안/검증 포함 | turnCount=3, asked=`problemJtbd → customerPersona → payer`, next 마지막=`payer` | 양면 중개인데 집이 고객인 것만 확인하고 공급·신뢰 가설로 못 감. 7항 실패 |
| **FIX-ONELINER** | 고객+문제+payer가 닫힌 뒤 `이 사업은 누구에게 무엇을 제공하나요?`를 다시 묻지 말 것 | S2 T3, S3 T3, S5 T3/T4 next=`businessOneLiner` | 문서에 이미 있는 한 줄은 미해결 핵심 가설이 아님 |
| **FIX-S4-JUDGMENT** | CONTRADICTED 고객이 judgment.customer 요약/상태를 뒤집거나 충돌로 표시 | gap=`CONTRADICTED`, next=재확인. summary=`맞벌이 부모`, knowledgeSource=`ceo_confirmed` | 상태가 바뀌어도 Founder가 보는 판단이 안 바뀌면 실패 |

### A4. 이미 PASS · 미검증

**PASS (기존, 이번에도 깨지지 않음):** R1, R2, R4, 선택지 절단 방지, 모름/빈 기타, 결제·지인 GO 가드, S4 다음 질문(재확인).

**NOT VERIFIED:** 로그인 UI 8턴 · 동결 시나리오 T1–T8 문구 일대일 · S4 T7(20대 확정 후 superseded).

---

## B. 실제 대화 I/O

원본: `docs/evidence/ALABOM/AI-PM/PR197-CPO-SECOND-VERIFY-DUMP.json`  
수정 전 위치: 커밋 `f83d15ed` / `meta.implSha` `404da1cf`  
수정 후 위치: 이 보고서와 같은 작업의 재실행 덤프 (`meta.implSha`는 아래 D).

### B1. FIX-S6 — 가사 중개 엔진 팔로우

**시나리오:** `engineFollowEightTurns.S6`  
**맥락 T1–T2 (수정 전후 동일):**

- T1 asked=`problemJtbd` · 질문=`고객이 지금 가장 불편해하는 점은 무엇인가요?` · 선택=`믿을 사람을 찾기 어렵고, 도우미는 일감이 불안정하다` · 입력=`지금 가장 크게 해결하려는 불편은 「믿을 사람을 찾기 어렵고, 도우미는 일감이 불안정하다」입니다.` · next=`customerPersona`
- T2 asked=`customerPersona` · 질문=`이 서비스를 가장 필요로 하는 사람은 누구인가요?` · 선택=`맞벌이 가정` · 입력=`이 서비스를 가장 필요로 하는 사람은 맞벌이 가정입니다.` · next=`payer`

**T3 — 실패 턴 (수정 전, JSON `engineFollowEightTurns.S6.turns[2]`)**

| 필드 | 실제 값 |
|---|---|
| askedGap | `payer` |
| askedQuestion | `이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?` |
| optionLabels | `집이 낸다` · `도우미가 낸다` · `양쪽이 낸다` · `기타` · `아직 모르겠음` |
| pickedLabel | `집이 낸다` |
| actualUserInput | `집이 낸다` |
| intent / applied | `business_fact` / true |
| gapStateAfter.payer | **OPEN** |
| extractedFacts | `{ key: buyer, value: 집이 낸다, evidenceClass: ASSUMPTION, confidence: low }` |
| reviewUnknown | `["payer"]` |
| nextTargetGap | **payer** |
| nextQuestionText | `맞벌이 가정에서 이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?` |
| 팔로우 결과 | turnCount **3** · askedGaps `[problemJtbd, customerPersona, payer]` · 같은 gap에서 정지 |

**기대:** payer CLOSED. 다음 질문은 같은 구매자가 아니라 대안/검증/공급 쪽. 팔로우 ≥ 5턴.

**차이:** 역할 선택 `집이 낸다`가 구매자를 닫지 못해 같은 질문을 되물었고, 팔로우 하네스가 정지했다.

**T3 — 수정 후 (같은 키 `engineFollowEightTurns.S6.turns[2]`)**

| 필드 | 실제 값 |
|---|---|
| actualUserInput | `집이 낸다` (동일 입력) |
| gapStateAfter.payer | **CLOSED** |
| extractedFacts | `{ key: buyer, value: 집이 낸다, evidenceClass: FACT, confidence: high }` |
| reviewUnknown | `[]` |
| nextTargetGap | **alternativesCompetitors** |
| nextQuestionText | `비슷한 역할을 이미 하고 있는 서비스가 있나요?` |
| 팔로우 결과 | turnCount **5** · askedGaps `[problemJtbd, customerPersona, payer, alternativesCompetitors, validationTestability]` |

T4 실제 선택: `지인 소개로 구한다` → 입력=`지금은 지인 소개로 구한다으로 비슷한 일을 하고 있습니다.` → next=`validationTestability`.  
결론 문장에 GO/검증 완료 없음.

같은 원인으로 깨지던 S4 스크립트 T3 `부모가 낸다`도 수정 전 payer **OPEN**·next=`payer`였고, 수정 후 payer **CLOSED**·next=`alternativesCompetitors`.

### B2. FIX-ONELINER — 구매자 닫힌 뒤 문서 한 줄

**시나리오:** `scriptedSixBusinesses.S2` T3 · JSON 경로 `scriptedSixBusinesses.S2.turns` 중 `askedGap=payer`

**맥락:** S2 문제 CLOSED(`양조장마다 채널이 흩어져…`) + 고객 CLOSED(`전통주를 선물·취미로 찾는 30–40대`).

**수정 전**

| 필드 | 실제 값 |
|---|---|
| askedGap | `payer` |
| pickedLabel / input | `쓰는 사람이 직접 낸다` |
| gapStateAfter | customerPersona CLOSED · payer **CLOSED** · problemJtbd CLOSED |
| nextTargetGap | **businessOneLiner** |
| nextQuestionText | `이 사업은 누구에게 무엇을 제공하나요?` |

S2 T4 대안(`이미 아는 술만 마트에서 산다`) 후에도 next는 다시 `이 사업은 누구에게 무엇을 제공하나요?`.  
S3 T3 입력=`서비스 비용은 사장님 본인이 지불합니다.` 후 next 동일.  
S5 T3 입력=`헬스 트레이너가 회원에게 추천하고 회원이 결제합니다` 후 next 동일.  
S5 T4 지인 1회 후에도 next 동일.

**기대:** payer 다음 ≠ 문서 한 줄. 미해결 가설(대안/검증)로 진행.

**수정 후 S2 T3**

| 필드 | 실제 값 |
|---|---|
| input | `쓰는 사람이 직접 낸다` (동일) |
| gapStateAfter.payer | CLOSED |
| nextTargetGap | **alternativesCompetitors** |
| nextQuestionText | `비슷한 역할을 이미 하고 있는 서비스가 있나요?` |

S3 T3 · S5 T3도 next=`alternativesCompetitors`. 문서 한 줄 문구 없음.

### B3. FIX-S4-JUDGMENT — 고객 정정 후 판단

**시나리오:** `scriptedSixBusinesses.S4` 마지막 턴 · JSON `scriptedSixBusinesses.S4.turns[3]` (스크립트는 T1 문제, T2 고객, T3 payer, T6 정정)

**맥락**

- T1 입력=`지금 가장 크게 해결하려는 불편은 「장을 볼 시간이 없고 과자 고르기가 피곤하다」입니다.`
- T2 입력=`이 서비스를 가장 필요로 하는 사람은 맞벌이 부모입니다.` → judgment.customer summary=`맞벌이 부모` · knowledgeSource=`ceo_confirmed`
- T3 (수정 전) 입력=`부모가 낸다` → payer OPEN (B1과 동일 원인). 수정 후 payer CLOSED
- T6 askedQuestion=`이미 구독료를 낸 부모가 있나요?` (validation 슬롯)

**수정 전 T6**

| 필드 | 실제 값 |
|---|---|
| actualUserInput | `사실 아이가 아니라 혼자 사는 20대가 메인이에요` |
| intent / applied | `correction` / false |
| gapStateAfter.customerPersona | **CONTRADICTED** |
| nextTargetGap / nextQuestion | `customerPersona` / `어느 쪽이 지금 맞는 고객인가요? 이전 고객 이해와 방금 답이 충돌합니다.` |
| judgmentAfter.customer | status=`needs_check` · summary=**`맞벌이 부모`** · knowledgeSource=**`ceo_confirmed`** · reason=`CEO 답변 — 추가 확인 필요` |
| livingClaims.customerPersona | `이 서비스를 가장 필요로 하는 사람은 맞벌이 부모입니다.` · confirmed · USER_CONFIRMED |
| extractedFacts / contradictions | `[]` / `[]` |

**기대:** 판단 요약이 맞벌이 부모 Fact로 남지 않음. 충돌 또는 재확인 상태로 표시.

**수정 후 T6** (같은 입력)

| 필드 | 실제 값 |
|---|---|
| gapStateAfter.customerPersona | CONTRADICTED |
| nextQuestionText | `어느 쪽이 지금 맞는 고객인가요? 이전 고객 이해와 방금 답이 충돌합니다.` (유지) |
| judgmentAfter.customer.summary | **`충돌: 맞벌이 부모 ↔ 혼자 사는 20대가 메인 — 재확인 필요`** |
| judgmentAfter.customer.reason | `Founder가 이전 고객 이해와 다른 고객을 말해 충돌로 표시함` |
| knowledgeSource | **null** (ceo_confirmed 제거) |
| status | `needs_check` |
| conclusion | GO/검증 완료 없음 |

**이전 잔여 (CPO 2차 NEEDS FIX, `59339f93` 당시):** livingClaims.customerPersona=`맞벌이 부모` · confirmed · USER_CONFIRMED. Memory customer current도 같은 문장. 판단만 덮음.

**이번 수정 후 T6** (같은 입력, `8965af43`)

| 필드 | 실제 값 |
|---|---|
| gapStateAfter.customerPersona | CONTRADICTED |
| judgmentAfter.customer.summary | `충돌: 맞벌이 부모 ↔ 혼자 사는 20대가 메인 — 재확인 필요` |
| judgmentAfter.customer.status / knowledgeSource | `needs_check` / null |
| livingClaims.customerPersona | **`충돌: 이 서비스를 가장 필요로 하는 사람은 맞벌이 부모입니다. ↔ 혼자 사는 20대가 메인 — 재확인 필요`** · **contradiction** · USER_CORRECTED |
| Memory customer | current **없음**. superseded=`이 서비스를 가장 필요로 하는 사람은 맞벌이 부모입니다.` · conflict=`혼자 사는 20대가 메인` |
| nextTargetGap / nextQuestion | `customerPersona` / `어느 쪽이 지금 맞는 고객인가요? 이전 고객 이해와 방금 답이 충돌합니다.` |
| 20대 승격 | 없음. conflict만 존재. USER_CONFIRMED 아님 |

### B3b. S4 T7 — 고객 재확인 (이번 실행, 이전에는 NOT VERIFIED)

**입력:** asked=`customerPersona` · 질문=`어느 쪽이 지금 맞는 고객인가요? 이전 고객 이해와 방금 답이 충돌합니다.` · 입력=`지금 메인 고객은 혼자 사는 20대예요`

| 필드 | 실제 값 |
|---|---|
| intent / applied | `business_fact` / true |
| gapStateAfter.customerPersona | **CLOSED** |
| livingClaims.customerPersona | **`지금 메인 고객은 혼자 사는 20대예요`** · confirmed · USER_CONFIRMED |
| Memory customer current | `지금 메인 고객은 혼자 사는 20대예요` |
| Memory customer superseded | `이 서비스를 가장 필요로 하는 사람은 맞벌이 부모입니다.` |
| Memory customer conflict | 없음 |
| judgmentAfter.customer | status=`clear` · summary=`지금 메인 고객은 혼자 사는 20대예요` · knowledgeSource=`ceo_confirmed` |
| nextTargetGap | `alternativesCompetitors` (이전 고객을 현재 Fact로 다시 묻지 않음) |
| nextQuestionText | `비슷한 역할을 이미 하고 있는 서비스가 있나요?` |

### B4. 기존 PASS 항목 — 재실행에서도 유지

R1 실제 next=`이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?` (문제 「맞나요?」 아님).  
R2 yes reason ≠ no reason. 둘 다 Fact/GO 아님.  
지인 1회 customerChange hypothesis.  
모름 payer OPEN · Memory buyer 없음.  
빈 기타는 waitingForFreeText.  
6사업 팔로우 결론에 GO 없음.

---

## C. 원인 분석

공통 축은 “답은 들어갔는데 닫힘·다음 질문·판단 제시가 같은 신호를 안 본다”이다. V3 파이프라인(Answer → interpret → review → gapState → next Q / judgment sync)은 유지했다.

### C1. FIX-S6 — 개별 원인, S4 `부모가 낸다`와 공유

| 항목 | 내용 |
|---|---|
| 실행 경로 | `applyBusinessChoiceThroughLoop` → `interpretAnswerSemantics` → `buildAnswerReview` → `deriveGapCompleteness` → `isOnSlotSufficient` → `isOnSlotPayerAnswer` |
| 원인 | `answerTextForOption`이 `낸다` 라벨을 래핑하지 않아 입력이 `집이 낸다` 그대로다. `isOnSlotPayerAnswer`는 `결제\|지불\|고객\|직접\|페르소나`만 인정한다. `집`/`부모`+`낸다`는 실패. 길이 5자는 quality=`PARTIAL`이라 `isOnSlotSufficient`가 false면 CLOSED가 되지 않는다. PARTIAL/OPEN이면 `isGapAskable(payer)`가 true라 같은 gap을 다시 고른다. 팔로우 하네스는 same-gap에서 정지. |
| 근거 | 수정 전 extractedFacts=`ASSUMPTION` · reviewUnknown=`payer` · gap=OPEN. S1 팔로우는 `사장님 본인이 지불합니다`라 `지불` 큐로 CLOSED되어 8턴까지 갔다. |
| 공통/개별 | S4 `부모가 낸다`와 **공통**. S2 `쓰는 사람이 직접 낸다`는 `직접` 큐로 이미 CLOSED — 한 줄 후퇴는 다른 원인(C2). |
| 최소 수정 | `payer-answer-cues.ts`에 역할+지불 동사(`집\|부모\|사장\|본사` + `낸다\|지불`). `isOnSlotSufficient`가 역할 답을 buyer로 인정. AC10: `아직 모르겠음`은 mergeable=false라 닫지 않음. |
| 회귀 | `pr197-conversation-quality` S6 집이 낸다 · dump S6 follow · recovery2 P0-1/P0-2 · MCQ |

### C2. FIX-ONELINER — 개별 원인 (skip 조건이 payer OPEN에 묶임)

| 항목 | 내용 |
|---|---|
| 실행 경로 | `decideNextQuestionFromReview` → `shouldSkipDocumentOneLiner` → `pickNextRequiredGap` · 보조: `applyJudgmentNextQuestionBinding` |
| 원인 | skip이 `고객/문제 CLOSED **그리고** payer가 아직 askable`일 때만 true. payer가 CLOSED가 되면 skip=false. Stage A 남은 칸이 `businessOneLiner`(문서에서 온 OPEN)이라 `이 사업은 누구에게 무엇을 제공하나요?`가 다시 나온다. V3-09상 one-liner가 OPEN이면 Stage A READY가 아니어서 Stage B도 막힌다. |
| 근거 | 수정 전 S2 T3 payer CLOSED 직후 next=`businessOneLiner`. 고객 직후(payer 미닫힘)에는 skip이 동작해 R1은 PASS. |
| 공통/개별 | S2–S5 **공통**. Recovery2 첫 질문은 고객/문제 미CLOSED라 한 줄이 맞다. |
| 최소 수정 | 고객 또는 문제가 CLOSED면 문서 한 줄을 skip. skip 중에는 Stage B 진입을 막지 않음. binding도 payer 닫힌 뒤 한 줄을 Stage B로 보냄. gapState를 CLOSED로 위조하지 않음. |
| 회귀 | quality S2–S5 after payer · dump scripted S2/S3/S5 · recovery2 P0-2 J1(첫 질문 한 줄 유지) |

### C3. FIX-S4-JUDGMENT — 개별 원인 (gapState와 judgment 분리)

| 항목 | 내용 |
|---|---|
| 실행 경로 | review가 off-slot `아니라` 정정을 CONTRADICTED로 씀 → `decideNextQuestion`은 재확인 Q를 냄 → `syncJudgmentAfterAnswer` → `buildCeoJudgmentStateWithTrace`는 living+turns만 읽음 |
| 원인 | `isCustomerCorrectionAnswer`는 `고객\|타깃`+양조/반찬 패턴만 본다. `사실 아이가 아니라 혼자 사는 20대가 메인이에요`는 고객 차원으로 merge되지 않는다. targetGap=`validationTestability`라 차원 바인딩이 customerChange 쪽. applied=false라 living도 안 바뀜. 판단은 이전 `맞벌이 부모`/`ceo_confirmed`를 유지. |
| 근거 | 수정 전 gap=CONTRADICTED인데 judgment.summary=`맞벌이 부모`. next Q는 이미 맞음. |
| 공통/개별 | 질문 층은 이전 PASS. **판단 층만 개별 실패.** |
| 최소 수정 | `overlayContradictedCustomer` — gapState.customerPersona===CONTRADICTED이면 summary를 충돌 문구로 덮고 `ceo_confirmed`를 제거. living/Memory는 이 패스에서 바꾸지 않음. |
| 회귀 | quality S4 judgment · dump S4 verdict `CONTRADICTED customer updates judgment summary` · recovery2 on-slot 정정은 CONTRADICTED 예외 유지 |

확인하지 못한 것(**추정**): living claim을 같은 턴에 contradicted로 내리는 것이 CPO 5항을 완전히 닫는지는 이번 최소 수정 밖. S4 T7(20대 선택 후 superseded)은 덤프에 없어 미실행.

---

## D. 수정 및 검증 결과

구현 후 실행 결과. 계획만으로 PASS를 선언하지 않는다.

### D1. 변경

| 커밋 | 역할 |
|---|---|
| 구현 | `59339f93` `feat(ai-pm): close CPO NEEDS FIX with inline review evidence` |
| 재실행 덤프 `meta.implSha` | `8965af43` |
| S4 일관성 구현 | `8965af43` |
| 이전 엔진 수정 | `59339f93` |
| 이전 실패 기준 | 구현 `404da1cf` · 덤프 핀 `f83d15ed` · CPO 판정 `f9911ed6` |

| 파일 | 함수 | 변경 |
|---|---|---|
| `payer-answer-cues.ts` | `isRolePayerAnswer` · `isOnSlotPayerAnswer` | 역할+낸다/지불 |
| `build-answer-review.ts` | `isOnSlotSufficient` | 역할 답을 payer CLOSE로 인정 |
| `decide-next-question-from-review.ts` | `shouldSkipDocumentOneLiner` · `pickNextRequiredGap` | 고객/문제 CLOSED면 한 줄 skip, Stage B 허용 |
| `ai-pm-judgment-next-question-binding.ts` | `applyJudgmentNextQuestionBinding` | 한 줄이 남으면 payer 또는 Stage B로 보냄 |
| `ai-pm-judgment-loop-sync.ts` | `overlayContradictedCustomer` | CONTRADICTED → 판단 충돌 문구. 이미 충돌 문구면 이중 포장 안 함 |
| `conversation-memory.ts` | `parkUnresolvedContradiction` | 이전 고객=superseded, 신규=conflict, current 없음 |
| `build-conversation-memory.ts` | `applyOpenCustomerContradiction` | gap CONTRADICTED면 Memory를 위 규칙으로 재구성 |
| `living-understanding-state.ts` | `resolveDomainValue(customerPersona)` | conflict 또는 gap CONTRADICTED면 contradiction. current Fact 아님 |
| `build-shared-understanding.ts` | `resolveCustomerField` | conflict면 충돌 문구. current는 `getFact`만 사용 |
| `process-loop-answer.ts` · dump/quality `livingNow` | Memory/living 재구성 | `gapState` 전달 |

V3 계약·CLOSED 단조성·결제/지인 약한 증거·unknown 비병합은 유지.

### D2. 수정 전후 대화 (실행)

섹션 B와 동일. 요약만 반복한다.

| ID | 입력 | 수정 전 출력 | 수정 후 출력 | CTO |
|---|---|---|---|---|
| FIX-S6 | `집이 낸다` | payer OPEN · next=payer · 3턴 정지 | payer CLOSED · next=대안 · 5턴 (대안+검증) | **PASS** (엔진) |
| FIX-ONELINER | S2 `쓰는 사람이 직접 낸다` | next=`이 사업은 누구에게 무엇을 제공하나요?` | next=`비슷한 역할을 이미 하고 있는 서비스가 있나요?` | **PASS** (엔진) |
| FIX-S4-JUDGMENT | `사실 아이가 아니라 혼자 사는 20대가 메인이에요` | summary=`맞벌이 부모` · ceo_confirmed | summary=`충돌: 맞벌이 부모 ↔ 혼자 사는 20대가 메인 — 재확인 필요` · knowledgeSource null | **PASS** (판단 층, CPO 확인) |
| S4 T6 상태 | 같은 입력 | living=USER_CONFIRMED 맞벌이 부모 · Memory current=맞벌이 부모 | living=contradiction · Memory current 없음 · superseded=부모 · conflict=20대 | **CTO VERIFIED** |
| S4 T7 | `지금 메인 고객은 혼자 사는 20대예요` | 미실행 | living/judgment/Memory current=20대 · 부모=superseded · next=대안 | **CTO VERIFIED** |

### D3. 테스트 명령과 결과

```text
pnpm --filter web exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-conversation-quality.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-cpo-second-verify-dump.test.ts
→ 2 files / 25 tests PASS (quality 24 + dump 1; quality에 S4 T6 living/Memory · T7 추가)

pnpm --filter web exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/core-v3-conversation-engine.test.ts
→ parkUnresolvedContradiction PASS. V3-03/V3-12는 baseline부터 실패 (이번 변경과 무관)

pnpm --filter web exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/recovery2-p0-1-state-edit-confirm.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/recovery2-p0-2-question-loop.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-mcq-journey.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-mcq-real-loop.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-mcq-business-understanding.test.ts
→ 5 files / 31 tests PASS
```

덤프 재현:

```text
pnpm --filter web exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-cpo-second-verify-dump.test.ts
```

플래그: `setV3ReviewPipelineForTest(true)` + `setAiPmJudgmentAggregationV1ForTest(true)`.

### D4. 상태표

| 항목 | 상태 | 근거 |
|---|---|---|
| FIX-S6 | **CTO VERIFIED** (엔진) | 새 덤프 S6 follow turnCount=5, asked에 alternatives+validation |
| FIX-ONELINER | **CTO VERIFIED** (엔진) | S2/S3/S5 payer 다음 ≠ 누구에게 무엇을 제공 |
| FIX-S4-JUDGMENT | **CTO VERIFIED** (판단 층) | CPO 2차에서 충돌 문구 확인 |
| S4 T6 상태 일관성 | **CTO VERIFIED** | gap=CONTRADICTED · living=contradiction · Memory current 없음 |
| S4 T7 재확인 | **CTO VERIFIED** | current=20대 · 부모=superseded · next=대안 |
| R1–R4 · GO 가드 | **CTO VERIFIED** (유지) | 덤프 재실행 |
| 로그인 UI 8턴 | **NOT VERIFIED** | 미실행 |
| 동결 8턴 문구 | **NOT VERIFIED** | 엔진 팔로우 ≠ 문구 일치 |
| CPO 2차 | **미판정** | 이 보고서 수령 후 |
| Merge / Production | **하지 않음** | 승인 대상 아님 |

### D5. 잔여 위험

1. T6 오슬롯 정정 문장이 `diffRelevance` current로도 남는다. 고객 Fact는 아님.
2. T7 이후 payer는 여전히 `부모가 낸다`. 고객 정정이 구매자 Gap을 자동으로 뒤집지는 않는다.
3. 문서 solution 스파인에 맞벌이 부모가 문서 출처로 남을 수 있다. current customer Fact는 아님.
4. S6 팔로우는 5턴. 공급 측 전용 검증까지는 이전과 같이 미도달.
5. V3-03/V3-12는 baseline부터 실패. 기대를 낮추지 않음.
6. 로그인 화면에서 같은 대화가 되는지는 모른다. 엔진 PASS ≠ UI PASS.

---

## E. CPO에게 요청하는 판정 범위

CPO는 위 A–D만으로 다음을 판정하면 된다.

1. T6에서 현재 확정 고객이 모순 상태와 일치하는가 (living contradiction, Memory current 없음).
2. 과거 맞벌이 부모 발언과 현재 유효 Fact가 구분되는가 (superseded vs current).
3. T7 확인 전까지 20대가 확정 Fact로 승격되지 않는가.
4. T7 이후 living · Memory · judgment · next ask가 같은 20대 고객을 참조하는가.

CTO는 병합하지 않는다. PR synchronize는 별도 작업 사유가 아니다.
