# ALABOM CPO Validation — Back Navigation

```text
Production SHA: 086da4eb0468c69a7ab10976092172e1ba49dfa2
Captured: 2026-08-28 (reused from W21 @ 086da4e — Turn 8)
Scenario: reach Q8 → ← 이전 답변 수정 → select prior turn → edit A → A'
Auth: Deferred — Demo
Verdict: PASS — supersede + understanding recalc observed
CPO review: pending — do NOT declare PASS
```

## Scenario

Reach adaptive Q loop (~turn 8), open **← 이전 답변 수정**, select a prior answer slot, submit corrected answer A3'. Verify:

- Old answer superseded in Living Understanding
- `understandingDelta` shows `변경: customerPersona: … → …`
- Downstream Q reframes with updated spine context

Dedicated supplemental harness timed out locating edit CTA after 3 turns; **W21 Production capture Turn 8** @ `086da4e` documents the full scenario with screenshot.

## Test input (same W21 seed)

```
외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.
```

## Turn 8 — prior edit (full body)

### Context (turns 1–7 summary)

| Turn | User | Effect |
|------|------|--------|
| 1–2 | Seed + confirm ✓ | AI first judgment; gap `alternativesCompetitors` |
| 3 | Competitor answer (클룩·트립닷컴…) | `alternativesCompetitors` confirmed |
| 4 | Differentiation answer | `differentiationHypothesis` confirmed |
| 5 | Nonsense ㅋㅋㅋㅋㅋㅋ | Rejected — understanding unchanged |
| 6 | Why: 왜 그게 중요하죠? | Display-only why path |
| 7 | Mid summary: 지금까지 이해한 사업 정리해줘 | Mid judgment |

### Turn 8 — Back navigation edit

- **Action:** Clicked `← 이전 답변 수정` → selected **customer definition** prior turn → submitted correction
- **User (A3'):** `정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.`
- **AI Q (after edit):** `지금 가장 크게 해결하려는 불편은 무엇인가요?`
- **Why now:** `해결하려는 불편이 비어 있으면 사업 판단의 출발점이 없습니다. 핵심 문제를 먼저 고정합니다.`
- **Judgment:** `customerPersona: 정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.`
- **Delta:** `변경: customerPersona: 방한 외국인 → 정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, …`
- **Coverage:** 30% → understanding recalc confirmed
- **Next Q:** Reframed problem JTBD embedding updated customer persona in stem
- **Screenshot:** [../conversation-validation/long-sprint-final/media/008-08-prior-edit.png](../conversation-validation/long-sprint-final/media/008-08-prior-edit.png)

### Turn 9 — downstream effect

After edit, next ask embeds corrected persona in question stem (`현재 이해(… · 정정합니다. 초기 타깃…)`), confirming downstream Q changed after supersede.

## Evidence source

| Artifact | Path |
|----------|------|
| Raw JSON (W21) | [../conversation-validation/long-sprint-final/transcript-raw.json](../conversation-validation/long-sprint-final/transcript-raw.json) |
| Full W21 table | [../conversation-validation/long-sprint-final/TRANSCRIPT.md](../conversation-validation/long-sprint-final/TRANSCRIPT.md) |
| Edit slice | [../long-sprint/TRANSCRIPT-EDIT.md](../long-sprint/TRANSCRIPT-EDIT.md) |

```text
CPO review: pending — do not PASS
CEO Walkthrough: NOT READY
```
