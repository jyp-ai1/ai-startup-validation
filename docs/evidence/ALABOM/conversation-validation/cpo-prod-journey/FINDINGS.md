# ALABOM conversation-validation — CPO Production Journey FINDINGS

```text
Date: 2026-08-26
Production tip: 5d255082f073e81513acb8b058b42902bacee2e6 (5d25508)
SHA check: MATCH via GET /api/build-info (deployTime ≈ 2026-08-26T14:07:39Z)
Entry: /demo/start (Demo)
Code change: NONE
Auth: untouched
Verdict language: factual observations only — no CPO PASS / FIX / HOLD verdict written here
```

## Scope

One full Production Demo founder journey for CPO turn-by-turn review. Seed: Seoul personalized experiences for foreign tourists (minimal one-sentence idea). Full log: `TRANSCRIPT.md` · raw: `transcript-raw.json`.

## Flow coverage (as far as product allowed)

| Step | Observed |
|------|----------|
| Min business description | Yes — Demo “내 사업 문서로 체험하기” + seed |
| AI first judgment | Yes — draft Confidence 49%; BUSINESS confirmed; PROBLEM/MARKET/COMPETITION pending |
| Q1→A1→Understanding | Yes — problem answer → PROBLEM ✔ + Understanding bullet |
| Q2→A2 | Yes — customer Q answered with payer content |
| Mid review request | Yes — overlay summary; **not** saved as Confirmed Fact (on-screen disclaimer) |
| Continue Q… | Yes — long stuck loop on demand-evidence Q |
| Competition / alternative | Yes — Klook/Trip.com answer accepted into Understanding |
| Differentiation | Yes — answer submitted while UI still on payer Q |
| Sufficiency | Yes — “Understanding is sufficient…” |
| Final viability review | Yes — start analysis → **GO 방향**, score **74** |

## Factual observations

1. **Template-like stock sequence** appeared: 해결하려는 불편 → 가장 필요로 하는 사람 → 수요 근거 → 누가 지불 (and re-asks). Flagged in raw `templateLikeTurns`.
2. **Why-now mismatched the visible question** at least twice: customer question paired with payer Why-now; demand question paired with “도달 채널” Why-now.
3. **Wrong-slot merge:** payer sentence stored under **CUSTOMER** spine while PROBLEM kept the problem text. Later, competition text also appeared on CUSTOMER in overview at sufficiency.
4. **Mid-summary:** User “지금까지 이해한 사업 정리해줘” produced an on-screen summary that stated it is **not** stored as Confirmed Fact — then returned to the same demand question.
5. **Demand re-ask loop:** Same “수요가 있다는 근거” question repeated across many turns while off-slot payer answers were submitted; gap judgment stayed “시장 근거가 확인되지 않았습니다.”
6. **Competition/differentiation while asking payer:** Answers still merged into Understanding; judgment continued to demand revenue structure / same payer Q.
7. **UI copy corruption** observed in Understanding/judgment: `정의](확인이 필요)`, `문서에서는 정의](으)로 보입니다.`
8. **Prior-answer edit control** visible this tip: `← 이전 답변 수정` (not exercised for edit outcome in this pack).
9. **Final review domain drift:** After analysis, SUMMARY mentioned **B2B SaaS** while journey spine remained foreign-tourist personalized Seoul experience; GO + score 74 shown.
10. **Coverage %** often absent on ask surface; final showed score chrome (74) and dimension scores.

## Explicit non-claims

- This pack does **not** claim CPO PASS, FIX, or HOLD.
- Auth was not exercised.
- No product / UX / prompt / Auth code was changed for this capture.
