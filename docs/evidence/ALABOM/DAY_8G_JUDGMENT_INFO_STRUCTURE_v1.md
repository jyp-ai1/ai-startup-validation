# ALABOM — DAY 8-G Judgment Info-Structure v1

**Date:** 2026-09-06  
**Project:** ALABOM  
**Status:** CPO **PASS** — unblocks DAY 8-G Implementation GO  
**Frozen:** DAY 8-F @ `309603730885ac793a3fba1203d84e9e5b795e4f`  
**Related:** [`DAY_8G_FLOW_SCREEN_DESIGN_v1.md`](./DAY_8G_FLOW_SCREEN_DESIGN_v1.md)

> CEO answer → update **how clearly ALABOM understands each judgment dimension** → show one review screen at the end.

---

## Core principles

1. **Do not force answers into question slots.** One CEO utterance may update multiple judgment items.
2. **Do not invent facts.** CEO did not say it → do not state as 🟢 confirmed.
3. **Separate status from content.** “한 곳에서 관리” = solution method, not necessarily customer outcome.
4. **Answer-first semantic mapping** (aligns with DAY 8-F direction).

---

## 1. Review result screen (final structure)

```text
사업 검토 결과

[ 한 줄 사업 이해 ]
누구의 문제를 / 무엇으로 해결하려는 사업인지 — one sentence

현재 판단
① 고객          🟢/🟡/🔴 + content + (implicit clarity)
② 문제          …
③ 해결 방법      …
④ 고객에게 달라지는 점 …

AI의 현재 결론
(prose — what is clear vs unknown, no market prediction)

다음으로 확인할 것
(one item only)
[ 이 부분 더 확인하기 ] [ 여기까지 검토하기 ]
```

CEO must understand business state from **this screen alone**.

---

## 2. Four judgment dimensions (CEO-facing only)

| # | Label (CEO) | Meaning |
|---|-------------|---------|
| ① | **고객** | Who is this for? |
| ② | **문제** | What pain / friction do they have? |
| ③ | **해결 방법** | What are you building / doing to address it? |
| ④ | **고객에게 달라지는 점** | What gets better for them if this works? |

**Not exposed on result v1:** JTBD, value proposition, differentiation, market channel, validation testability, payer, factKey, gap, semantic cluster — internal AI only.

### Terminology lock

| ❌ Avoid | ✅ Use |
|--------|--------|
| 고객 가치 / 기대효과 / 가치 제안 | **고객에게 달라지는 점** |
| 어떤 가치를 만드나요? | 가장 **좋아지는 점**은 무엇인가요? |

---

## 3. Status per dimension (no scores)

| Status | Meaning |
|--------|---------|
| 🟢 **명확** | CEO stated concretely; fits business context |
| 🟡 **확인 필요** | Direction visible; specificity or evidence weak |
| 🔴 **아직 모름** | Not enough from current conversation |

**No** “사업성 72점” or market success predictions in DAY 8-G v1.

---

## 4. Status vs fact (example)

CEO: *“직접 배송하는 소상공인이 고객이고 주문과 배송을 한 곳에서 관리하게 하려고 합니다.”*

| Dimension | Content | Status |
|-----------|---------|--------|
| 고객 | 직접 배송하는 소상공인 | 🟢 |
| 해결 방법 | 주문과 배송을 한 곳에서 관리 | 🟢 |
| 고객에게 달라지는 점 | — | 🟡 (method ≠ outcome yet) |

**Forbidden:** infer “관리 시간 30% 감소” without CEO saying so.

---

## 5. Answer → judgment update (G-4 engine)

### Not

```text
question = gap → answer fills one slot
```

### Is

```text
CEO answer
  → semantic interpretation
  → customer? problem? solution? customer-change?
  → update ALL matching dimensions
```

### Example A — one answer, multiple updates

CEO: *“주문관리부터 배송관리까지 연결된 서비스가 없고, 직접 배송하는 반찬가게·꽃집 사장님들이 주문과 배송을 따로 관리해야 합니다.”*

| Dimension | Status | Content |
|-----------|--------|---------|
| 고객 | 🟢 | 직접 배송하는 소상공인 |
| 문제 | 🟢 | 주문·배송 분리 관리 불편 |
| 해결 방법 | 🟡 | 주문·배송 연결 서비스 |
| 고객에게 달라지는 점 | 🔴 | 미확인 |

### Example B — answer targets effect only

CEO: *“배송 누락을 줄이고 주문 확인 시간을 줄여주려고 합니다.”*

→ **고객에게 달라지는 점** 🟢; keep existing 고객/문제/해결; **do not re-ask** known items.

### Example C — off-topic but useful

CEO (asked about customer change): *“지금은 엑셀과 카톡으로 주문 관리합니다.”*

→ Do not discard; strengthen **문제** / current-alternatives evidence; next question = **remaining weakest dimension**.

---

## 6. AI의 현재 결론 (rules)

CEO question: *“그래서 AI는 지금 이 사업을 어떻게 보고 있어?”*

### ❌ Forbidden

- 사업성 74점
- 시장성이 높습니다
- 성공 가능성이 있습니다

### ✅ Required pattern

> 고객과 문제는 비교적 명확하지만, 실제 고객이 이 문제를 얼마나 심각하게 느끼는지는 아직 확인되지 않았습니다.

**Judge only within evidence.** Even if ①②③ are 🟢, do not conclude “high business viability” without customer validation.

---

## 7. 다음으로 확인할 것

- **Exactly one** follow-up focus on result screen
- `[ 이 부분 더 확인하기 ]` → **one question** → answer → **updated judgment view**
- Not 5 questions from result screen

```text
검토 결과 → 부족 판단 1개 → 질문 1개 → 답변 → 검토 결과 업데이트
```

---

## 8. Judgment View (single component, two titles)

Same screen structure; title varies by session phase:

| Phase | Title |
|-------|-------|
| From ~3rd answer (optional) | **현재까지의 사업 판단** |
| At 5 questions / session end | **사업 검토 결과** |

Not two separate screen implementations.

---

## 9. Question screen hierarchy (CEO)

| Priority | Content |
|----------|---------|
| 1 | Question (human language) |
| 2 | Answer guide (below question) |
| 3 | Answer input |
| 4 | Minimal progress (`3 / 5`) |
| — | `왜 이 질문을 하나요? ▾` (collapsed) |

### Judgment view hierarchy

| Priority | Content |
|----------|---------|
| 1 | Current business judgment (one-liner) |
| 2 | Four dimensions + status |
| 3 | AI의 현재 결론 |
| 4 | 다음으로 확인할 것 |

---

## 10. Remove from default UI (DAY 8-G)

- Long `AI가 이해한 현재 사업` block
- Long `현재 판단` preamble on question screen
- Question duplicated in textarea
- Internal meta (semantic repeat, memory_document, gap, fieldKey)
- Consulting jargon in default copy
- Multiple simultaneous questions

---

## 11. CPO decisions — all four blockers resolved

| # | Decision | Locked |
|---|----------|--------|
| ① | Question stop | Min 4-dimension readiness **OR** max **5** questions → judgment view |
| ② | Judgment reveal | From **3rd** optional; **5th** automatic |
| ③ | Judgment shape | 4 dimensions + 🟢🟡🔴 + conclusion + one next check |
| ④ | “검토 결과” moment | Single Judgment View; title shift at session end |

### G-4 engine locks

| Rule | Lock |
|------|------|
| Mapping | Answer-first semantic |
| One answer | Multi-dimension update OK |
| Off-slot answer | Keep; strengthen relevant dimension |
| Unsaid facts | Never infer as confirmed |
| Next question | Weakest remaining dimension, **one** |
| Scores | None |

---

## 12. Implementation constraints (CTO)

DAY 8-G adds **Judgment Presentation / Aggregation layer** on top of:

- DAY 8-F F-1~F-5 (preserve)
- Existing V3 SoT (preserve)

### Forbidden

- V3 core rewrite
- gapState / factKey wholesale redesign
- Research Engine
- Stage B expansion

### Epic scope (for sprint directive)

| Epic | Scope |
|------|-------|
| G-1 | Simple Question UX |
| G-2 | Answer Guide |
| G-3 | Progressive Disclosure |
| G-4 | Answer → Judgment Update Engine |
| G-5 | Judgment View + Question Budget / Stop |

---

## 13. CPO status

| Gate | Verdict |
|------|---------|
| DAY 8-F | 🔒 CLOSED @ `3096037` |
| DAY 8-G Flow v1 | ✅ PASS |
| DAY 8-G Judgment Info-Structure v1 | ✅ **PASS** |
| DAY 8-G Implementation | 🟢 **GO** (await sprint directive) |

Next: **DAY 8-G Sprint directive** — DoD, test scenarios, Production Gate.
