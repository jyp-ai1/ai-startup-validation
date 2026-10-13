# PR #197 — 동결 T1–T8 불일치 원인과 계약

CPO 게이트: 동결 문구 1:1은 **NEEDS FIX / FAIL** 유지. 기대한 질문 문구를 낮추지 않았다.  
엔진 SoT(Stage A · FIX-10 · T7 payer-hold)는 재작성하지 않았다.  
T6 buyer 차단 · T7 `next=payer` · S6/S2/S3/S5 회귀는 유지. AC16/AC5는 완화하지 않았다.  
Google OAuth 8턴 · Production 대화는 **NOT VERIFIED**. 병합·배포하지 않는다.

상태 어휘: NOT STARTED · IMPLEMENTED · CTO VERIFIED · CPO VERIFIED · NEEDS FIX · NOT VERIFIED  
엔진 PASS와 UI PASS를 한 줄로 합치지 않는다.

| 항목 | 값 |
|---|---|
| 동결 본문 SHA | `5263e83e` |
| 1:1 덤프 | `PR197-CPO-FROZEN-T1-T8-DUMP.json` · compared=35 · exact=0 |
| 분류 덤프 | `PR197-CPO-T1-T8-DIVERGENCE-DUMP.json` |
| 엔진 경로 | `resolveNextQuestionDecision` → `applyTypedAnswerThroughLoop` |
| Production | `0b465226` 불변 |

---

## 1. 계약 판정

동결 시나리오 `5263e83e`는 **제품 런타임 SoT가 아니다.**  
`docs/product/ai-pm-closed-conversation-scenarios.md` 머리글이 이미 이렇게 적혀 있다.

- CPO 일괄 검토용 기대 대화
- 「승인 후 이 기대를 테스트 케이스로 옮긴다」
- 「코드는 재승인 전까지 바꾸지 않는다」
- 「아키텍처: V3 living / review / next-question / judgment 유지. 엔진 재작성 없음」

런타임 SoT는 다음이다.

1. Stage A Required: `businessOneLiner` → `customerPersona` → `payer` → `problemJtbd`
2. 문서에 고객 또는 문제가 있으면 한 줄 확인을 건너뛴다 → **첫 질문 = 고객 페르소나**
3. FIX-10: `customer` → `problem` → `solution`
4. T7 payer-hold: 고객+문제 CLOSED 이고 payer OPEN 이면 next=`payer` (CPO VERIFIED)

따라서 T1–T8 문구 0/35는 **시나리오 문서 계약과 엔진 SoT 계약이 다르다**는 증거다.  
엔진이 동결 문서를 깨고 있는 단일 버그로 보면 안 된다.

이미 있는 재생기 `followEngine`은 첫 갭을 `problemJtbd`로 **하드코딩**한다. 이는 엔진 SoT가 아니라 시나리오 어댑터다.

---

## 2. 시나리오별 첫 질문 · 순서 · 중단 · next target

Track A = 엔진 SoT 첫 질문 + 동결 답을 **턴 번호**로 주입 (CPO가 본 1:1 FAIL).  
기대 문구는 `5263e83e` 원문.

| 시나리오 | 동결 T1 갭 | 엔진 T1 갭 | 동결 T1 문구 | 엔진 T1 문구 | Track A 턴 | 중단 |
|---|---|---|---|---|---|---|
| S1 | problem | customerPersona | 고객이 지금 가장 불편해하는 점은 무엇인가요? | 이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요? | 5 | T5 next=null |
| S2 | problem | customerPersona | 지금 가장 크게 풀려는 불편은 무엇인가요? | 같은 고객 질문 | 7 | T7 next=null |
| S3 | problem | customerPersona | 지금 가장 크게 줄이려는 실수는 무엇인가요? | 같은 고객 질문 | 5 | T5 next=null |
| S4 | problem | customerPersona | 부모가 지금 가장 귀찮아하는 점은 무엇인가요? | 같은 고객 질문 | 5 | T5 next=null |
| S5 | problem | customerPersona | 고객이 지금 단백질 간식에서 가장 불만인 점은 무엇인가요? | 같은 고객 질문 | 8 | 없음. 문구 0/8 |
| S6 | marketplaceSide (엔진 갭 없음) | customerPersona | 지금 먼저 풀 쪽은 어디인가요? | 같은 고객 질문 | 5 | T5 next=null |

S1 Track A 이후 next target (엔진): T1 next=`problemJtbd` → T2 next=`solution` → T3 next=`problemJtbd` 재질문 → T4 next=null.  
동결 기대 순서: problem → customer → payer → revenue → alternatives.

불일치 클래스:

| 클래스 | 의미 | 대표 |
|---|---|---|
| FIRST_QUESTION | T1 갭이 다름 | 전 시나리오 Track A T1 |
| ORDER | 같은 턴의 갭이 다름 | S1 T2 엔진=problem, 동결=customer |
| WORDING | 갭은 같고 문장만 다름 | Track C S1 T1 gap-map vs 동결/MCQ |
| OFF_SLOT_ANSWER | 동결 T{n} 답을 엔진이 물은 다른 갭에 넣음 | Track A 전 구간 |
| STOP | next 없음 | S1/S3/S4/S6 T5, S2 T7 |

S6 T1 `지금 먼저 풀 쪽은 어디인가요?`는 Stage A 갭이 없다. 면 선택은 프레젠터 질문이다.

---

## 3. 5턴 중단 원인

S1 T5 정지 시점 gapState:

- customerPersona = OPEN (문제 답을 고객 슬롯에 넣음)
- problemJtbd = PARTIAL
- solution = OPEN
- revenueModel = CLOSED (`월 구독`이 다른 슬롯에서 추출됨)
- `noAskableGap` = **false**

즉 물을 갭이 없는데 끝난 것이 아니다. 오프슬롯 답으로 상태가  Twisted 된 뒤 anti-repeat / no-gap-termination이 next를 비운다.

Track B (같은 SoT 첫 질문, 답을 **물은 갭에 매핑**):

| 시나리오 | 턴 수 | reachedEight | 첫 갭 |
|---|---|---|---|
| S1–S6 | 8 | true | customerPersona |

S2 Track B askedGaps: `customerPersona → problemJtbd → payer → alternatives → validation → solution → validation → revenue`.  
고객+문제를 온슬롯으로 닫으면 next=`payer`로 이어진다 (T7 정책과 맞음).

결론: CPO 덤프의 5턴 중단은 **제품 공백이 아니라 1:1 하네스가 동결 답을 턴 순서로 넣은 오염**이다.

---

## 4. 최소 수정안 (엔진 SoT 미변경)

| 안 | 내용 | 회귀 | 이번 적용 |
|---|---|---|---|
| A. 엔진 첫 질문을 문제로 | Stage A / FIX-10 / T7와 충돌 | T7 CPO VERIFIED 위험 | **하지 않음** |
| B. 동결 기대 문구를 SoT에 맞춤 | CPO 문서 개정 필요 | 1:1 게이트를 낮추는 것과 같음 | **하지 않음** |
| C. 시나리오 검증 어댑터 | 답을 물은 갭에 매핑. 중단과 문구를 분리 측정 | 런타임 무변경 | **적용** (테스트 전용) |

C를 넣어도 Track A 1:1은 **exact 0/35 FAIL** 이다. 기대를 낮추지 않았다.

문구 게이트를 PASS로 만들려면 CPO가 다음 중 하나를 **명시**해야 한다.

1. `5263e83e` 본문을 엔진 SoT 순서(고객 → 문제 → payer)와 gap-map 문장으로 개정한다.
2. 엔진 SoT를 problem-first · 사업별 문장으로 재승인한다. 이는 Journey 계약 변경이다.

CTO는 2를 이번 작업에서 실행하지 않는다.

---

## 5. 수정 후 비교

Track A (기대 문구 불변): compared=35, exactMatches=0. S1/S3/S4/S6 5턴 중단 재현.  
Track B: 6사업 모두 8턴. 중단 없음.  
Track C (problem-first 재생, 엔진 SoT 아님): S1 T2만 exact 1건. S1 T1은 같은 갭이어도 gap-map 문구 `지금 가장 크게 해결하려는 불편은` ≠ 동결 `고객이 지금 가장 불편해하는 점은`. MCQ 프레젠터는 동결 S1 T1과 같고, typed SoT는 gap-map을 쓴다.

엔진 테스트: T7 payer-hold PASS · S4 라우팅 PASS · 어댑터/분류 PASS.  
UI 테스트: 이번 작업에서 재실행하지 않음. 이전 로그인 UI 증거 유지.  
AC16: expected `businessOneLiner`, received `alternativesCompetitors`.  
AC5: expected `marketChannel`, received `alternativesCompetitors`. 단언 문구 그대로.

---

## 6. 병합 게이트

| 게이트 | 판정 | 근거 |
|---|---|---|
| T6 buyer 오사용 차단 | CPO VERIFIED 유지 | 기존 dump. 재구현 없음 |
| T7 `next=payer` | CPO VERIFIED 유지 | `5720ff8b` · 단위 테스트 PASS |
| S6/S2/S3/S5 회귀 | 이전 제출 PASS 유지 | 로그인 UI 증거. 엔진 미개작 |
| 동결 T1–T8 문구 1:1 | NEEDS FIX / FAIL | 35비교 0 exact. 기대 문구 불변 |
| Google OAuth 8턴 | NOT VERIFIED | 계정 동의·세션 없음 |
| Production 대화 | NOT VERIFIED | SHA `0b465226`. PR 미배포 |
| AC16 / AC5 | 기존 부채 | 테스트 2건 실패 유지 |
| PR #197 전체 병합 | 승인 보류 | 필수 게이트 미통과 |
