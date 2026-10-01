# Gate 1 — Production Browser Evidence (CPO DoD)

**Date:** 2026-10-01 UTC  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Verdict:** 🟢 **PASS** (Browser E2E + SHA equality)

---

## SHA equality

| | Value |
|---|--------|
| **Git SHA (main merge #52)** | `e68e3cc1771b41eb67915e10ae1c37604b05c6d0` |
| **Build SHA** (`/api/health` → `commit`) | `e68e3cc1771b41eb67915e10ae1c37604b05c6d0` |
| **Production SHA** | `e68e3cc1771b41eb67915e10ae1c37604b05c6d0` |

```text
Git SHA = Build SHA = Production SHA  ✅
```

Gate 1 feature commit (pre-merge): `3a15d36d69a8e24416131c12e169c780a8131fb1` (included in merge above).

---

## Browser E2E (Production)

Script: `apps/web/scripts/production-gate1-demo-browser.mjs`  
Raw JSON: `docs/evidence/ALABOM/GATE1-PRODUCTION/gate1-browser-result.json`

| # | Scenario | Result |
|---|----------|--------|
| 1 | Sample A — 클리닉플로우 | 🟢 PASS |
| 2 | Sample B — 동네장터알림 | 🟢 PASS |
| 3 | Sample C — 핏브릿지 | 🟢 PASS |
| 4 | My Business A (동네장터 QA-A) | 🟢 PASS |
| 5 | My Business B (핏브릿지 QA-B) | 🟢 PASS |

### Sample checks (each)

- Seeded markers present; SmartPM strings absent
- `demo-sample-{slug}` session namespace (no shared `demo-session` for new entries)
- Playback bar `[다음]` advances `frameIndex` monotonically
- Judgment / Final Review surface reached in UI

### My Business checks

- A vs B preview text distinct (`QA-A` vs `QA-B`, different problem/customer)
- No SmartPM in user path
- Judgment/Review not entered (Preview / Reading phase)

### Isolation

| Check | Result |
|-------|--------|
| My Business A ≠ B | 🟢 |
| Sample → My Business: MB document/loop **no** clinic seed text | 🟢 |
| SmartPM in My Business after Sample | 🟢 absent |
| Legacy sample keys may coexist in sessionStorage | ℹ️ allowed (separate namespaces; MB reads `demo-my-*` only) |

---

## Known observation (non-blocking)

On some Sample playback steps, UI `lockedAskSurface` may show a **probe** variant of the same gap (e.g. business one-liner “조금 더 구체적으로…”) while `frameIndex` still advances through materialized frames. **Frame index monotonicity PASS**; visible question copy diversity is a **follow-up UX polish**, not a SmartPM / isolation failure.

---

## CEO TEST

**HOLD → CPO re-review:** submit this evidence for **CEO TEST GO** decision.
