# Sprint 1.3 — Evidence-driven Validation Loop

**Version:** Sprint 1.3 (replaces "Adaptive Thinking Engine")  
**Owner:** CPO  
**Assignee:** Cursor CTO  
**Trigger:** [CPO_REVIEW_EVIDENCE_FLOW.md](./CPO_REVIEW_EVIDENCE_FLOW.md) · ADR-023

---

## Sprint Goal

AI를 똑똑하게 만드는 것이 아니다.

> **사용자가 "왜 이런 결과가 나왔는지" 이해할 수 있는 Evidence → Research → Result → Improve 루프**

---

## Product philosophy

```text
생각 → 증거 수집 → 조사 → 근거 → 보완 → 다시 조사
```

LaunchLens is **not** an AI that gives answers. It is a workspace that validates strategy **with evidence**.

---

## P0 (shipped first — validation path)

- [x] Always-visible **AI 조사 시작** button
- [x] Accordion evidence inputs (problem / customer / MVP / pricing)
- [x] Remove fake % scores and GO/HOLD from validation + conclusion UI
- [x] Replace overnight fiction with input-based copy
- [x] Conclusion order: findings → opinion → why → improve loop

---

## P1 (next)

- [ ] Merge evidence loop into `/my-projects/[id]` project workspace
- [ ] Persist evidence in `onboarding_context` / `project_context` (not sessionStorage)
- [ ] Real pipeline findings wired to evidence completeness
- [ ] Remove remaining % / HOLD from workspace cards (V2 home)

---

## Anti-patterns (never)

- Score without evidence
- GO/HOLD without rationale
- "밤새 조사" when user just clicked
- Toggle chips that don't open inputs
- Gating AI button behind arbitrary threshold

---

## Release Rule

Same as Sprint 1.2 — Preview URL + QA checklist before PM sign-off.

**QA doc:** [SPRINT_1_3_QA.md](./SPRINT_1_3_QA.md)
