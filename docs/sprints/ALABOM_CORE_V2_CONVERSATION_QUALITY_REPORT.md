# ALABOM Core v2 — Conversation Quality Verification Report

```text
Date: 2026-08-26
Production: https://ai-startup-validation-tau.vercel.app
Entry: /demo/start (Demo only — Auth untouched)
Production SHA: c485ce78dd2151eb974c5591c07772a95a50db37
Feature ancestor: 89e3464 (Living Understanding State SoT) — included in tip
Capture method: Playwright against Production Demo (real UI text; not invented)
Evidence: docs/evidence/ALABOM/core-v2/conversation-quality/
Code Change: NONE
Auth: untouched
CPO Decision Required: HOLD until CPO reviews transcripts
```

Seed (TEST 01 exact):

> 외국인 관광객을 대상으로 한국의 숨은 맛집과 로컬 체험을 연결해주는 여행 서비스를 만들고 싶습니다.

---

### TEST 01 — 신규 사업 (exact seed)

Result: **FAIL**

Expected: AI states understanding + asks who pays (tourist vs venue); after “관광객이 직접 결제합니다” update understanding and ask why choose vs existing travel services.

Actual: After confirm, Q1 was **problem/inconvenience**, not payer. Payment answer was slotted as **Problem**. Next Q still asked who pays.

대화 transcript:

```
[AI Read / Confirm]
AI가 이해한 내용:
  BUSINESS: 외국인 관광객을 대상으로 한국의 숨은 맛집과 로컬 체험을 연결해주는 여행 서비스를 만들 (Confirmed from document)
  CUSTOMER: 방한 외국인 (AI estimate)
  PROBLEM: 아직 확인 중
↓
질문 1
지금 가장 크게 해결하려는 불편은 무엇인가요?
왜 묻나요 · 이것만 확인되면 문제 분석을 시작할 수 있습니다.
지금 판단: 풀려는 문제가 확인되지 않았습니다.
사용자 답변
관광객이 직접 결제합니다
↓
AI가 이해한 내용 (갱신):
  ✓ 사업 문장 유지
  ✓ 관광객이 직접 결제합니다  ← spine PROBLEM 슬롯에 들어감 (WHAT I UNDERSTAND SO FAR · PROBLEM = Founder confirmed)
  현재 판단 (recognition): 구체화도 35%. 다음 공백: 「payer」이 아직 구체화되지 않았습니다.
↓
질문 2
서비스 비용은 누가 지불하나요?
왜 묻나요 · 이것만 확인되면 시장성 분석을 시작할 수 있습니다.
지금 판단: 수익 구조가 확인되지 않았습니다.
```

| 검증 | 결과 |
|---|---|
| 이전 답변을 다음 질문에 반영 | FAIL — 결제 답을 PROBLEM에 넣고 payer를 다시 물음 |
| Understanding 실제 갱신 | PARTIAL — 문장은 추가됐으나 슬롯/의미가 틀림 |
| AI 판단 % 변경 | PASS — recognition에 구체화도 35% 표시 |
| Gap 1개 우선 질문 | PARTIAL — 한 질문씩이지만 템플릿 순서(문제→결제) |
| 뒤로가기 후 재판단 | N/A |
| Why 처리 | N/A (이 테스트 범위 외; purpose 문구는 존재) |
| 충분성 판단 | N/A |
| 다음 단계 전환 | N/A |
| 최종 결과물 연결 | N/A |

Evidence:
- `docs/evidence/ALABOM/core-v2/conversation-quality/01-after-ai-read.png`
- `docs/evidence/ALABOM/core-v2/conversation-quality/01-q1-ask.png`
- `docs/evidence/ALABOM/core-v2/conversation-quality/01-q2-after-payer.png`

---

### TEST 02 — Answer feeds next Q

Result: **PARTIAL**

Answer used (exact):

> MZ 관광객이고 인스타그램에서 유명한 곳보다 현지인들이 가는 곳을 찾고 싶어합니다.

Note: At submit time the open question was still **「서비스 비용은 누가 지불하나요?」** (not a customer Q). The product accepted the MZ text anyway.

대화 transcript:

```
질문 (제출 직전)
서비스 비용은 누가 지불하나요?
사용자 답변
MZ 관광객이고 인스타그램에서 유명한 곳보다 현지인들이 가는 곳을 찾고 싶어합니다.
↓
AI가 이해한 내용:
  ✓ 사업 문장
  ✓ 관광객이 직접 결제합니다
  ✓ MZ 관광객이고 인스타그램에서 유명한 곳보다 현지인들이 가는 곳을 찾고 싶어합니다
  WHAT I UNDERSTAND · CUSTOMER → 「MZ 관광객 · 방한 외국인」
↓
질문 다음
이 시장에 수요가 있다는 근거는 무엇인가요?
왜 묻나요 · 이것만 확인되면 기회 규모 분석을 시작할 수 있습니다.
지금 판단: 시장 근거가 확인되지 않았습니다.
```

| 검증 | 결과 |
|---|---|
| 이전 답변을 다음 질문에 반영 | PARTIAL — MZ가 understanding/고객에 반영; 그러나 “누가 지불?”에 MZ를 답해도 통과 |
| Understanding 실제 갱신 | PASS — Customer spine에 MZ 반영 |
| AI 판단 % 변경 | N/A (이 턴 스크린에 % 미고정; Overview 이후 40%대 관찰) |
| Gap 1개 우선 질문 | PARTIAL — 재질문 “고객은 누구인가요?”는 없음; 다음이 시장 근거 템플릿 |
| 뒤로가기 후 재판단 | N/A |
| Why 처리 | N/A |
| 충분성 판단 | N/A |
| 다음 단계 전환 | N/A |
| 최종 결과물 연결 | N/A |

FAIL criterion check: did **not** re-ask “고객은 누구인가요?” → re-ask FAIL not triggered.  
PASS criterion check: deeper find/book/experience Q → **not observed** (market-evidence template instead).

Evidence: `docs/evidence/ALABOM/core-v2/conversation-quality/02-after-mz-answer.png`

---

### TEST 03 — Coverage %

Result: **PASS** (real labels present; not decorative-only)

Observed on Production Demo:

- Ask recognition / judgment: **구체화도 35%** (+ gap label `payer`)
- Overview board: **Business specificity 40%** (mid-run) → later **55%**
- Confirmed vs remaining: Progress checks (Business / Customer / Market) + Overview rows (Confirming founder / Competition pending) + “Next to confirm”
- Near review path: Progress includes **Ready for review** / later copy **Core understanding is sufficient. Ready for review.**

| 검증 | 결과 |
|---|---|
| 이전 답변을 다음 질문에 반영 | N/A |
| Understanding 실제 갱신 | N/A |
| AI 판단 % 변경 | PASS — 35% → 40% → 55% across turns |
| Gap 1개 우선 질문 | PARTIAL — %와 함께 gap/next-confirm 표시 |
| 뒤로가기 후 재판단 | N/A |
| Why 처리 | N/A |
| 충분성 판단 | PARTIAL — sufficiency copy later appears with % |
| 다음 단계 전환 | N/A |
| 최종 결과물 연결 | N/A |

Evidence: `docs/evidence/ALABOM/core-v2/conversation-quality/03-coverage.png` (+ 01-q2 recognition 35%, end-state Overview 55% in capture log)

---

### TEST 04 — Back edit

Result: **BLOCKED**

UI limitation (exact):

- Ask loop has **no** control to reopen/edit a prior Q&A turn (no “이전 답변 수정 / 뒤로가기→재판단” affordance observed on Demo ask surface).
- Pre-confirm revise (`No — I'll correct`) exists only on Shared Understanding confirm, not mid-loop.
- Contradiction panel (`이전에 확인한 내용과 새 답변이 다릅니다`) **did not appear** when a conflicting payer answer was submitted after “관광객이 직접 결제합니다”.
- Conflicting facts were **both kept** in understanding list (tourist pays + venue pays).

대화 transcript (conflict attempt):

```
이전 이해: 관광객이 직접 결제합니다 (PROBLEM/결제 관련으로 이미 확정)
사용자 새 답변
결제 고객은 맛집 사장님이고, 관광객은 무료로 추천만 받습니다.
↓
관찰
- contradiction-confirm UI: 미표시
- understanding 목록에 두 결제 서사가 공존
- 재판단 = 단순 append + 다음 템플릿 질문으로 진행 (우선 슬롯 무효화/재질문 없음)
```

| 검증 | 결과 |
|---|---|
| 이전 답변을 다음 질문에 반영 | FAIL — 충돌 답도 merge |
| Understanding 실제 갱신 | PARTIAL — 값 추가는 되나 재판단/무효화 없음 |
| AI 판단 % 변경 | N/A |
| Gap 1개 우선 질문 | N/A |
| 뒤로가기 후 재판단 | **BLOCKED** — UI 없음 |
| Why 처리 | N/A |
| 충분성 판단 | N/A |
| 다음 단계 전환 | N/A |
| 최종 결과물 연결 | N/A |

Evidence: `docs/evidence/ALABOM/core-v2/conversation-quality/04-after-edit.png`

---

### TEST 05 — Why

Result: **FAIL**

User challenge (exact):

> 왜 그게 중요하죠?

Expected: explain why needed (purchase/judgment reason), then return to loop. FAIL if just repeats / mishandles.

Actual:

1. Ask surface already shows purpose: `왜 묻나요 · …` (generic stage unlock copy).
2. Typing the meta-question as an answer was **accepted as a Fact**.
3. **CUSTOMER** spine became literally `왜 그게 중요하죠?` (Founder confirmed).
4. No purchase-reason explanation; loop advanced to competition Q.

대화 transcript:

```
질문 (직전 예시)
(루프 진행 중 gap 질문 — purpose: 왜 묻나요 · 이것만 확인되면 누구를 위한 사업인지 분석을 시작할 수 있습니다.)
사용자 답변
왜 그게 중요하죠?
↓
AI 처리
- answer-quality reject/설명 없음
- CUSTOMER = 「왜 그게 중요하죠?」 Founder confirmed
- understanding 목록에도 ✓ 왜 그게 중요하죠? 추가
↓
질문 다음
비슷한 역할을 이미 하고 있는 서비스가 있나요?
왜 묻나요 · 이것만 확인되면 경쟁 구도 분석을 시작할 수 있습니다.
```

| 검증 | 결과 |
|---|---|
| 이전 답변을 다음 질문에 반영 | FAIL — meta-Q를 고객 정의로 반영 |
| Understanding 실제 갱신 | FAIL — 오염된 갱신 |
| AI 판단 % 변경 | N/A |
| Gap 1개 우선 질문 | N/A |
| 뒤로가기 후 재판단 | N/A |
| Why 처리 | **FAIL** — 설명 없이 Fact merge |
| 충분성 판단 | N/A |
| 다음 단계 전환 | N/A |
| 최종 결과물 연결 | N/A |

Evidence:
- `docs/evidence/ALABOM/core-v2/conversation-quality/05-before-why.png`
- `docs/evidence/ALABOM/core-v2/conversation-quality/05-after-why-typed.png`

---

### TEST 06 — Sufficiency

Result: **PARTIAL**

Reachable: yes (after several answers). Observed on Overview after later turns:

- **Business specificity 55%**
- Copy: **Core understanding is sufficient. Ready for review.**
- Progress: Market understanding checked; **Ready for review** still open
- Ask loop **still open** on competition: `비슷한 역할을 이미 하고 있는 서비스가 있나요?`
- `conversational-final-output` / explicit next-stage handoff **not** reached in this Demo capture

| 검증 | 결과 |
|---|---|
| 이전 답변을 다음 질문에 반영 | N/A |
| Understanding 실제 갱신 | N/A |
| AI 판단 % 변경 | PASS — 상승 관찰 |
| Gap 1개 우선 질문 | PARTIAL — sufficiency copy와 병행해 경쟁 Q 유지 |
| 뒤로가기 후 재판단 | N/A |
| Why 처리 | N/A |
| 충분성 판단 | PARTIAL — 문구/％는 있음, endless-Q 정지는 불완전 |
| 다음 단계 전환 | FAIL/PARTIAL — Ready-for-review 카피만, stage handoff UI 미도달 |
| 최종 결과물 연결 | FAIL — final output panel 미도달 |

Evidence: capture log + Overview state at end of TEST 05 run (`transcript-capture.json` → tests.06); related shot `05-after-why-typed.png` (progress Market checked / competition active).

---

## Overall summary (9 checks × tests)

| 검증 | T01 | T02 | T03 | T04 | T05 | T06 |
|---|---|---|---|---|---|---|
| 이전 답변을 다음 질문에 반영 | FAIL | PARTIAL | N/A | FAIL | FAIL | N/A |
| Understanding 실제 갱신 | PARTIAL | PASS | N/A | PARTIAL | FAIL | N/A |
| AI 판단 % 변경 | PASS | N/A | PASS | N/A | N/A | PASS |
| Gap 1개 우선 질문 | PARTIAL | PARTIAL | PARTIAL | N/A | N/A | PARTIAL |
| 뒤로가기 후 재판단 | N/A | N/A | N/A | BLOCKED | N/A | N/A |
| Why 처리 | N/A | N/A | N/A | N/A | FAIL | N/A |
| 충분성 판단 | N/A | N/A | PARTIAL | N/A | N/A | PARTIAL |
| 다음 단계 전환 | N/A | N/A | N/A | N/A | N/A | PARTIAL |
| 최종 결과물 연결 | N/A | N/A | N/A | N/A | N/A | FAIL |

### Per-test rollup

| Test | Result |
|---|---|
| 01 신규 사업 | **FAIL** |
| 02 Answer feeds next Q | **PARTIAL** |
| 03 Coverage % | **PASS** |
| 04 Back edit | **BLOCKED** |
| 05 Why | **FAIL** |
| 06 Sufficiency | **PARTIAL** |

### Form-like regression detected?

**YES.** Strong signals:

1. Issue-template question order (problem → payer → market evidence → competition) over semantic conversation.
2. Payment answer stored as **Problem**; payer gap still open.
3. Meta-question `왜 그게 중요하죠?` stored as **Customer**.
4. Contradictory payer facts both retained; no contradiction UI / invalidate.
5. Purpose copy is stage-generic (`이것만 확인되면 … 분석을 시작할 수 있습니다`) more than purchase-reason coaching.

CTO A–F functional PASS ≠ conversational quality PASS.

### Known Issues (honest)

See `docs/evidence/ALABOM/core-v2/KNOWN_ISSUES.md` (conversation quality section).  
Also mirrored into `docs/sprints/ALABOM_CORE_V2_CPO_PRODUCTION_TEST_READY.md` Known Issues.

---

```
CPO Decision Required: HOLD until CPO reviews transcripts
Code Change: NONE
Auth: untouched
Production SHA: c485ce78dd2151eb974c5591c07772a95a50db37
```
