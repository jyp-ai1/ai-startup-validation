# Release Pipeline — LaunchLens

> LaunchLens ships **experiences**, not features.  
> CEO must never be the first person to discover a broken flow.

---

## Pipeline (fixed order) — Evidence Release

LaunchLens is a **Learning Product**. Deploy is not the end.

```text
Code Complete
      ↓
Production Deploy
      ↓
E2E (2 videos)
      ↓
Experience Gate + CTO Self Review
      ↓
PM Test
      ↓
CEO Test
      ↓
Evidence Accepted
      ↓
Release Complete
```

| Stage | Owner | Pass means |
|-------|-------|------------|
| Code Complete | CTO | Merged on `main`, build green |
| Production | CTO | Push + Vercel + SHA match |
| E2E | CTO | 2 Production recordings attached |
| Experience Gate | CTO | Self Review PASS on both flows |
| PM Test | PM | Founder sessions · fill `docs/evidence/` |
| CEO Test | CEO | Market-level feedback on flow |
| **Evidence Accepted** | PM + CPO | 5 sessions + synthesis · H1 decision |
| **Release Complete** | CPO | Keep/Kill/Refine recorded · sprint closed |

**Do not skip stages.** PM Test before Experience Gate = wasted observation.

---

## Release Checklist (copy every handoff)

```text
Deployment
□ Commit
□ Push
□ Production
□ SHA

Experience
□ E2E Video 1 — Start Free → Insight
□ E2E Video 2 — Demo → Login → Continue
□ Experience Gate PASS
□ CTO Self Review

Validation
□ Evidence Collected (docs/evidence/SPRINT4_H1/)
□ Evidence Review (synthesis.md)
□ Hypothesis Decision (Keep / Kill / Refine)

Handoff
□ PM Test Ready          ← after Experience PASS
□ Evidence Accepted      ← after 5 sessions + synthesis
□ Release Complete       ← after CPO sign-off
```

**Goal is not "배포 완료" — it is "가설 검증 완료".**

---

## Experience Gate

E2E proves the path **can be walked**. Experience Gate asks whether the path **feels like LaunchLens**.

### Flow 1 — Start Free

```
Landing → Start Free → Login → Workspace → PDF Upload
  → AI Read → Review → Insight
```

| Check | Question |
|-------|----------|
| □ Progress | 끝까지 진행 가능한가? |
| □ No stall | 막히지 않는가? (멈춤, dead button, silent disable) |
| □ AI first | AI가 먼저 일한다고 느껴지는가? (Form-first = FAIL) |

### Flow 2 — Open Demo

```
Landing → Demo → Review → Insight → Login → Continue
```

| Check | Question |
|-------|----------|
| □ Feels like demo | Demo 같다 (샘플이지만 real flow) |
| □ Continues | 내 프로젝트로 이어진다 |
| □ Save intent | 저장하고 싶어진다 (Login CTA timing) |

**Experience Gate PASS** = all six checks □ → ✅ for the flow being reviewed.

---

## CTO Self Review (attach after each video)

Video alone is not evidence. Every recording must include this table.

### Template

```text
Flow: ____________________
Result: PASS | FAIL

Why?
- (one sentence — user perception, not code)

Fix priority: P0 | P1 | skip

PM Test Ready? YES | NO
```

### Example (Flow 2)

```text
Flow: Demo → Login → Continue
Result: FAIL

Why?
Insight 이후 Login CTA가 없다. 사용자는 끝났다고 생각한다.

Fix priority: P0

PM Test Ready? NO
```

### Example (Flow 1 — partial pass)

```text
Flow: Start Free → Insight
Result: FAIL

Why?
PDF 업로드 없이 paste만 가능. "AI가 읽었다"는 느낌은 있으나 Start Free 여정과 불일치.

Fix priority: P1

PM Test Ready? NO
```

---

## E2E recordings (Production only)

~5 min each. Links required in handoff message.

| # | Path | Recording link |
|---|------|----------------|
| 1 | Start Free → Insight | |
| 2 | Demo → Login → Continue | |

See step lists in `docs/sprints/E2E_VERIFICATION_GATE.md` (same flows).

---

## Role split

| Role | Responsibility |
|------|----------------|
| **CTO** | Experience가 끊기지 않는 제품 · Production · E2E · Experience Gate |
| **PM** | Evidence 수집 및 해석 · `docs/evidence/` session files |
| **CPO** | Hypothesis 유지/기각 결정 · synthesis · Keep/Kill/Refine |
| **CEO** | 실제 시장 관점의 최종 피드백 · CEO Test |

Roles do not overlap: CTO does not interpret Evidence; PM does not ship without Experience PASS.

**Evidence store:** [`docs/evidence/`](../evidence/README.md)

---

## PM / CEO one-liner to CTO

> Production **E2E 영상 2개** + **CTO Self Review** + **Experience Gate PASS** 전에는 PM 테스트 요청하지 마세요.

---

## Related

- `docs/sprints/E2E_VERIFICATION_GATE.md` — E2E step detail + code gaps
- `docs/sprints/CTO_WORKSPACE_EXPERIENCE_FIXES.md` — P0 product gaps
- `docs/DEPLOYMENT_RULE.md` — deploy mechanics
