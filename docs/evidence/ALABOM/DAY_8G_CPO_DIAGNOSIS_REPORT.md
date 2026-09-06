# ALABOM — DAY 8-G CPO Diagnosis: AI Judgment & Simple Conversation

**Date:** 2026-09-06  
**Project:** ALABOM  
**Prior epic:** DAY 8-F ✅ CLOSED @ Production `3096037` — **do not modify**  
**Status:** **Design phase — no CTO implementation until judgment info-structure sign-off**  
**Flow v1:** [`DAY_8G_FLOW_SCREEN_DESIGN_v1.md`](./DAY_8G_FLOW_SCREEN_DESIGN_v1.md)

---

## Core problem (CEO)

> ALABOM feels like **“AI keeps asking business validation questions”**, not **“AI is judging my business.”**

After many answers, CEO cannot answer:

> **“So how is AI judging my business right now?”**

This is **not a simple UI bug**. It is a product-structure problem.

---

## Product north star (DAY 8-G)

Shift from:

```text
질문 → 답변 → 질문 → 답변 → … (no destination)
```

To:

```text
CEO 답변 → AI 이해 → AI 판단 업데이트 → 현재 판단 보여줌 → (필요 시) 질문 1개 → 반복
```

**Every answer must update visible AI judgment.**

---

## Five design pillars (CPO)

| # | Change | Summary |
|---|--------|---------|
| G-1 | **Human-language questions** | Remove consulting jargon (“가치”, “기대효과”) from default CEO copy |
| G-2 | **Answer guides per question** | Short examples below question — not textarea placeholder |
| G-3 | **Progressive disclosure** | Hide “AI understanding / judgment / why now” by default; `왜 이걸 확인하나요? ▾` |
| G-4 | **Answer → judgment loop** | Each turn visibly updates structured judgment (problem, customer, confidence) |
| G-5 | **Question budget + judgment checkpoint** | Stop infinite questions; show **사업 판단 확인하기** at threshold |

---

## P0 examples (CEO feedback)

### P0-A — Abstract “value” question

**Bad (current pattern):**

> 우리와 같은 … 어떤 **가치**를 만드나요?

**Good (target copy):**

> 직접 배송을 관리하는 사장님에게, 이 서비스가 생기면 **가장 좋아지는 점**은 무엇인가요?

With answer guide (below question, not placeholder):

- 배송 누락을 줄일 수 있다
- 주문과 배송을 한 곳에서 관리할 수 있다
- 배송 상태를 쉽게 확인할 수 있다

### P0-B — UI noise

CEO needs only:

```text
[ AI 질문 ]
[ 답변 가이드 (짧게) ]
[ 답변 입력 ]
[ 답변하기 ]
```

Not: duplicated question in textarea, stacked blocks, always-visible rationale.

### P0-C — No judgment destination

CEO must repeatedly see **현재 사업 판단** with confidence signals (🟢🟡🔴) and know when the loop can end.

---

## Terminology map (internal → CEO-facing)

| Internal / legacy | CEO copy |
|-------------------|----------|
| 어떤 가치를 만드나요? | 가장 좋아지는 점은 무엇인가요? |
| 기대효과 | 무엇이 좋아지나요? |
| 차별적 가치 | 기존 방법보다 뭐가 더 좋아지나요? |
| 검증 가능성 | 실제 고객에게 물어보면 확인할 수 있을까요? |

Professional terms stay in **AI internal judgment**, not default UI.

---

## Question budget (draft)

**Stage: 사업 이해** — required judgment points:

1. 고객  
2. 문제  
3. 해결방법  
4. 고객이 얻는 변화  
5. 경쟁/대안  
6. 실제 가능성  

→ AI judgment update after each answer  
→ Ask **at most one** question when genuinely missing  
→ At threshold: **“현재 사업 판단을 확인해보세요.”**

---

## CPO open decisions (block implementation)

Must be decided **before** CTO work order:

| # | Decision |
|---|----------|
| ① | **When to stop asking** — question budget / readiness gate |
| ② | **When to show AI business judgment** — per-turn vs checkpoint |
| ③ | **Judgment presentation shape** — blocks, confidence, one-liner summary |
| ④ | **“검토 결과를 보자” moment** — CTA, copy, transition UX |

---

## Explicit HOLD (unchanged from 8-F)

- Research Engine  
- Stage B  
- V3 Core / gapState / factKey wholesale redesign  
- DAY 8-F code paths (frozen @ `3096037`)

---

## Success criterion (future)

CEO can answer after a session:

> “AI가 지금 내 사업을 **이렇게** 판단하고 있고, **여기까지** 확신 / **여기**는 아직 확인 필요.”

And can reach **사업 판단 확인하기** without infinite question fatigue.

---

## Next step

CPO defines **DAY 8-G user flow + screen structure** → then CTO implementation brief.

**No coding until CPO sign-off on ①–④.**
