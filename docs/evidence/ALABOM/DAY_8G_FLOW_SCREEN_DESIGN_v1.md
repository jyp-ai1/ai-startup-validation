# ALABOM — DAY 8-G Flow & Screen Structure v1

**Date:** 2026-09-06  
**Project:** ALABOM  
**Status:** CPO design v1 — **Implementation HOLD**  
**Frozen:** DAY 8-F @ `3096037`  
**Prior:** [`DAY_8G_CPO_DIAGNOSIS_REPORT.md`](./DAY_8G_CPO_DIAGNOSIS_REPORT.md)

> Questions are not the goal. **Judgment is the goal.**

---

## 1. Experience shift

### Before

```text
질문 → 답변 → 질문 → 답변 → … (no destination)
```

### After (DAY 8-G)

```text
사업 입력 → AI 이해 → 질문 1개 → CEO 답변 → AI 판단 업데이트
  → (repeat) → "현재까지 판단 보기" → 사업 판단
  → [더 확인하기] | [검토 결과 보기]
```

---

## 2. G-1 — Question stop (dual exit)

Not “5 questions = done” alone. Not “AI decides enough = infinite ask.”

### Exit A — Minimum judgment readiness

AI can explain (at rough level):

| # | Judgment point |
|---|----------------|
| ① | 누구의 문제인가? |
| ② | 무엇이 불편한가? |
| ③ | 무엇을 해결하려는가? |
| ④ | 고객에게 무엇이 달라지는가? |

Criterion: **Can we produce a business judgment from what we know so far?** (not perfect answers)

### Exit B — Question budget

**Max 5 questions per review session** — even if incomplete.

At 5: **always show current judgment.** Gaps marked 🔴 아직 확인되지 않음.

```text
충분히 알았다 → 판단 보기
아직 부족하다 → 5개까지만 질문 → 판단 보기
```

**ALABOM must be a product that ends questions.**

---

## 3. G-2 — When to show judgment (UI)

**Not** full judgment block after every answer (text overload).

| Moment | CEO sees |
|--------|----------|
| After each answer | Compact: `✓ 이해 업데이트됨` |
| From ~3rd answer onward | CTA: `[ 현재 사업 판단 보기 → ]` |
| At budget / readiness | Full judgment card or review result |

Between questions — optional progress:

```text
사업 이해 진행 중
● ● ● ○ ○
현재 3개의 핵심 내용을 확인했습니다.
[ 현재 사업 판단 보기 ]
```

At 5 questions:

```text
확인할 내용을 충분히 모았습니다.
[ 사업 검토 결과 보기 → ]
```

---

## 4. G-3 — Judgment card (core screen)

Replace stacked blocks (이해 / 판단 / 확인할 것) with **one judgment card**:

```text
현재 사업 판단

[한 줄 요약 — prose]

고객          …
문제          …
해결하려는 것  …

현재 판단
🟡 [상태 + 한 줄 이유]

[ 아직 더 확인하기 ]
[ 검토 결과 보기 ]
```

Judgment expression: **status + one-line reason** — no scores (80점) in v1.

| Signal | Meaning |
|--------|---------|
| 🟢 확인됨 | Connection / clarity sufficient |
| 🟡 확인 필요 | Direction understood; need still uncertain |
| 🔴 부족함 | Cannot judge business viability yet |

---

## 5. G-4 — Question screen (minimal)

### Remove

- Duplicated question in textarea
- Always-visible long “현재 판단” / “지금 확인할 것” preamble
- Consulting jargon in default copy

### Single-question layout

```text
지금 확인할 것

[Human-language question — one screen hero]

예를 들어
[2–3 short example bullets]

[ 답변을 입력하세요................ ]

              [답변하기]

왜 이 질문을 하나요? ▾
```

**Why collapsed by default** — CEO-facing rationale only. No semantic repeat, memory, gap, fieldKey.

### Question copy rules

| ❌ Avoid | ✅ Use |
|----------|--------|
| 어떤 가치를 제공하나요? | 가장 좋아지는 점은 무엇인가요? |
| 기대효과 | 무엇이 좋아지나요? |
| JTBD | 무엇 때문에 가장 불편한가요? |
| 차별적 가치 | 기존 방법보다 뭐가 더 편한가요? |

Internal AI may use professional models; **CEO questions = everyday language.**

### Answer guide (per question)

Below question, not placeholder:

> 💡 시간, 비용, 실수, 불편 중 무엇이 줄어드는지…  
> 예: `배송 누락을 줄일 수 있다` …

---

## 6. G-5 — Review result (destination screen)

First time CEO sees **complete ALABOM judgment**:

```text
━━━━━━━━━━━━━━━━━━
      사업 검토 결과
━━━━━━━━━━━━━━━━━━

한 줄 판단
[…]

현재 판단
🟢 고객        …
🟢 문제        …
🟡 해결책      …
🔴 고객 필요성 …
🔴 지불 의사   …

AI의 현재 결론
"[prose conclusion]"

━━━━━━━━━━━━━━━━━━

[ 고객 필요성 확인하기 ]
[ 여기까지 검토하기 ]
```

CEO outcome:

> “ALABOM이 지금 내 사업을 **이렇게** 판단하고 있구나.”  
> “다음에 **뭘 검증**해야 하는지도 알겠다.”

**5 questions ≠ review complete.** 5 = max session time. Result must say **“현재 정보 기준 판단”** — 🔴 when unknown, no fake optimism.

---

## 7. End-to-end flow (frozen v1)

```text
             사업 입력
                 ↓
          AI가 사업 이해
                 ↓
        ┌────────────────┐
        │ 질문 1개        │
        │ + 답변 가이드   │
        └────────────────┘
                 ↓
              CEO 답변
                 ↓
        ✓ 이해 업데이트됨 (compact)
                 ↓
        ┌────────────────┐
        │ 다음 질문 필요? │
        │ + budget ≤ 5   │
        └────────────────┘
          ↓           ↓
         YES          NO / budget
          ↓           ↓
     질문 계속    판단 카드 / 검토 결과
          ↓
    (max 5) ──────────┘
```

---

## 8. CPO decision table (v1 locked)

| Item | Decision |
|------|----------|
| Questions per turn | **1** |
| Question language | CEO everyday language |
| Answer guide | Below question, short |
| Question rationale | Collapsed by default |
| Current understanding blocks | Hidden by default |
| Judgment update | Internal every turn; UI compact feedback |
| Judgment reveal | Available from ~3 answers; mandatory at budget |
| Max questions | **5 / session** |
| At 5 questions | **Always** judgment / review screen |
| Judgment format | Status + one-line reason |
| Scores | Not shown in v1 |
| Review result | Separate screen |
| Further validation | Optional from result |
| Infinite questions | **Forbidden** |

---

## 9. Open before CTO GO

CPO next design artifact:

> **사업 검토 결과의 실제 정보 구조** — what fields ALABOM shows in the final judgment object (customer, problem, solution, need, willingness-to-pay, etc.) and how `답변 → 판단 업데이트` maps to it.

Until that structure is signed off: **Implementation HOLD.**

---

## 10. CEO experience targets

| Before | After |
|--------|-------|
| “또 질문이네…” | “내 답변 듣고 AI 판단이 바뀌었네.” |
| “끝이 없네…” | “이제 AI가 어떻게 보는지 볼 수 있네.” |
| “괜찮다는 거야?” | “다음에 뭘 검증해야 하는지 알겠네.” |

---

## References

- DAY 8-F frozen: `309603730885ac793a3fba1203d84e9e5b795e4f`
- HOLD: Research Engine · Stage B · V3 core rewrite · 8-F regression paths
