# Operating Mode — STABLE v1.0

**운영체계 Stable.** 프로세스를 더 다듬지 않는다.  
Center: **프로세스를 검증하지 말고, 제품을 검증하라.**

```
Knowledge (S10–S12) FROZEN
        ↓
Implementation (S13+)
        ↓
Acceptance
        ↓
Evidence
        ↓
CPO Review
        ├── PASS  → Sprint Complete
        └── REJECT → Fix Scope → Re-submit
        ↓
CEO (only after CEO READY)
```

---

## Roles

| Role | Owns |
|------|------|
| Knowledge S10–S12 | Frozen |
| CTO | Implementation + Acceptance + Evidence + CTO Conclusion |
| CPO | Architecture Review — PASS / REJECT / 수정 범위 |
| CEO | 사용 경험 — CEO READY 이후만 |

---

## Sprint cycle

```
Rule → Implementation → Acceptance → Evidence → CPO → PASS|REJECT
```

**DoD:** Acceptance pass · Rule Tests pass · Evidence matches code · **CPO PASS**  
Else: 🟡 REVIEW PENDING

**Package:** Acceptance Contract · Rule Tests · Evidence · CTO Conclusion · CPO Review

**CPO 3 questions (only):** Contract? Evidence↔code? Architecture freeze intact?

---

## Change control (최종 잠금)

> **Sprint Retrospective에서는 운영체계를 바꾸지 않는다.**

| When | May change |
|------|------------|
| **Implementation / Retrospective** | Rule 구현 · 제품 경험 · 버그 |
| **Sprint Planning only** | Acceptance Contract · Operating Mode · Gate · Architecture · Knowledge |

```
Planning → Architecture change 가능
────────────────
Implementation → Architecture 변경 금지
Retrospective → 다음 Planning에서만 Architecture 검토
```

Do **not** mid-sprint: Acceptance · Rule (design) · Canon · Gate · Operating Mode.

---

## Evolution (reference)

기능→QA→CEO → … → Knowledge→Impl→Acceptance→Evidence→CPO→CEO  
= mature. Stop iterating the process; iterate the product.

References: `DESIGN_FREEZE_S10_S12.md` · `S13_IMPLEMENTATION.md` · `S13_ACCEPTANCE_CONTRACT.md`
